import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { 
  FiWifi,
  FiCpu, 
  FiCompass, 
  FiActivity, 
  FiShield, 
  FiPlay, 
  FiBox, 
  FiCheckCircle, 
  FiAlertTriangle,
  FiSliders,
  FiZap,
  FiRepeat,
  FiRefreshCw,
  FiCheck,
  FiX,
  FiArrowRight,
  FiCrosshair,
  FiLayers,
  FiLock,
  FiUnlock,
  FiInfo,
  FiMaximize2,
  FiEye,
  FiServer
} from 'react-icons/fi';

/* ========================================================================= */
/* SIMULATOR 1: 6-AXIS JOINT JOGGER & KINEMATICS INSPECTOR (Module 1)        */
/* ========================================================================= */
export function RobotJointJoggerSimulator() {
  const [joints, setJoints] = useState({
    S: 0,   // Base Swivel: -170 to +170
    L: -20, // Lower Arm: -65 to +155
    U: 40,  // Upper Arm: -180 to +70
    R: 0,   // Roll Forearm: -190 to +190
    B: 30,  // Bend Wrist: -135 to +135
    T: 0    // Turn Flange: -360 to +360
  });

  const resetHome = () => setJoints({ S: 0, L: 0, U: 0, R: 0, B: 0, T: 0 });
  const setPickPose = () => setJoints({ S: 45, L: 25, U: -35, R: 0, B: 60, T: -45 });
  const setInspectPose = () => setJoints({ S: -60, L: -15, U: 50, R: 90, B: -40, T: 15 });

  // Calculate approximate TCP coordinates based on forward kinematics
  const rad = (deg) => (deg * Math.PI) / 180;
  const l1 = 350; // mm base height
  const l2 = 450; // mm lower arm
  const l3 = 400; // mm upper arm
  const l4 = 150; // mm wrist to TCP

  const thetaS = rad(joints.S);
  const thetaL = rad(joints.L);
  const thetaU = rad(joints.U);
  const thetaB = rad(joints.B);

  // Simplified 2D reach projection
  const reach = (l2 * Math.cos(thetaL) + l3 * Math.cos(thetaL + thetaU) + l4 * Math.cos(thetaL + thetaU + thetaB));
  const tcpX = Math.round(reach * Math.cos(thetaS));
  const tcpY = Math.round(reach * Math.sin(thetaS));
  const tcpZ = Math.round(l1 + l2 * Math.sin(thetaL) + l3 * Math.sin(thetaL + thetaU) + l4 * Math.sin(thetaL + thetaU + thetaB));

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 md:p-6 shadow-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest px-2.5 py-1 bg-amber-400/10 rounded-full border border-amber-400/20">
            Interactive Lab 1
          </span>
          <h3 className="text-lg md:text-xl font-black text-white mt-1 flex items-center gap-2">
            <FiSliders className="text-amber-400" /> จำลองการควบคุมแกนหุ่นยนต์ 6 แกน (6-Axis Joint Jogger)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            ปรับมุมการหมุนของแต่ละแกน (S, L, U, R, B, T) เพื่อสังเกตตำแหน่งพิกัดปลายแขนกล (TCP Forward Kinematics)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetHome} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition">
            Home (0°)
          </button>
          <button onClick={setPickPose} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition">
            Pick Pose
          </button>
          <button onClick={setInspectPose} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition">
            Inspect Pose
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sliders Area */}
        <div className="lg:col-span-7 space-y-3">
          {[
            { key: 'S', name: 'S-Axis (Swivel / J1)', desc: 'หมุนฐานลำตัวแนวนอน', min: -170, max: 170, color: 'text-amber-400', ring: 'accent-amber-500' },
            { key: 'L', name: 'L-Axis (Lower Arm / J2)', desc: 'ยกแขนท่อนล่าง ก้ม/เงย', min: -65, max: 155, color: 'text-orange-400', ring: 'accent-orange-500' },
            { key: 'U', name: 'U-Axis (Upper Arm / J3)', desc: 'ยกแขนท่อนบน พับ/เหยียด', min: -180, max: 70, color: 'text-yellow-400', ring: 'accent-yellow-500' },
            { key: 'R', name: 'R-Axis (Roll Forearm / J4)', desc: 'บิดหมุนแกนปลายแขน', min: -190, max: 190, color: 'text-emerald-400', ring: 'accent-emerald-500' },
            { key: 'B', name: 'B-Axis (Bend Wrist / J5)', desc: 'หักข้อมือขึ้น/ลง', min: -135, max: 135, color: 'text-sky-400', ring: 'accent-sky-500' },
            { key: 'T', name: 'T-Axis (Turn Flange / J6)', desc: 'หมุนหน้าแปลนติดตั้ง Tool', min: -360, max: 360, color: 'text-purple-400', ring: 'accent-purple-500' }
          ].map(joint => (
            <div key={joint.key} className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className={`font-black ${joint.color}`}>{joint.name}</span>
                  <span className="text-slate-400 text-[11px] ml-2 hidden sm:inline">({joint.desc})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                    {joints[joint.key]}°
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">[{joint.min}° ถึง {joint.max}°]</span>
                </div>
              </div>
              <input
                type="range"
                min={joint.min}
                max={joint.max}
                value={joints[joint.key]}
                onChange={e => setJoints(prev => ({ ...prev, [joint.key]: parseInt(e.target.value) }))}
                className={`w-full ${joint.ring} cursor-pointer`}
              />
            </div>
          ))}
        </div>

        {/* 3D Wireframe & Kinematics Display */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden min-h-[260px]">
            <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-500">
              SIMULATED WORKSPACE ELEVATION
            </div>

            {/* SVG Visualizer */}
            <svg viewBox="-300 -400 600 450" className="w-full h-56">
              {/* Floor grid */}
              <line x1="-250" y1="20" x2="250" y2="20" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
              <rect x="-60" y="0" width="120" height="20" fill="#1e293b" stroke="#475569" strokeWidth="2" rx="4" />

              {/* S-Axis Base Pedestal */}
              <rect x="-40" y="-50" width="80" height="50" fill="#334155" stroke="#64748b" strokeWidth="2" rx="3" />
              <circle cx="0" cy="-50" r="14" fill="#f59e0b" />
              <text x="0" y="-46" textAnchor="middle" fill="#000" fontSize="10" fontWeight="bold">S</text>

              {/* L-Axis Link */}
              {(() => {
                const baseL = -50;
                const lenL = 120;
                const angleL = (joints.L - 90) * (Math.PI / 180);
                const xL = lenL * Math.cos(angleL);
                const yL = baseL + lenL * Math.sin(angleL);

                // U-Axis Link
                const lenU = 110;
                const angleU = (joints.L + joints.U - 90) * (Math.PI / 180);
                const xU = xL + lenU * Math.cos(angleU);
                const yU = yL + lenU * Math.sin(angleU);

                // Wrist Link
                const lenW = 50;
                const angleW = (joints.L + joints.U + joints.B - 90) * (Math.PI / 180);
                const xW = xU + lenW * Math.cos(angleW);
                const yW = yU + lenW * Math.sin(angleW);

                return (
                  <g>
                    {/* Lower Arm */}
                    <line x1="0" y1={baseL} x2={xL} y2={yL} stroke="#f97316" strokeWidth="12" strokeLinecap="round" />
                    <circle cx={xL} cy={yL} r="12" fill="#fb923c" />
                    <text x={xL} y={yL + 3} textAnchor="middle" fill="#000" fontSize="9" fontWeight="bold">L/U</text>

                    {/* Upper Arm */}
                    <line x1={xL} y1={yL} x2={xU} y2={yU} stroke="#38bdf8" strokeWidth="10" strokeLinecap="round" />
                    <circle cx={xU} cy={yU} r="10" fill="#0284c7" />
                    <text x={xU} y={yU + 3} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">R/B</text>

                    {/* Wrist & End-Effector */}
                    <line x1={xU} y1={yU} x2={xW} y2={yW} stroke="#a855f7" strokeWidth="6" strokeLinecap="round" />
                    <circle cx={xW} cy={yW} r="7" fill="#ef4444" />
                    
                    {/* Gripper / TCP Crosshair */}
                    <circle cx={xW} cy={yW} r="12" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" />
                    <line x1={xW - 16} y1={yW} x2={xW + 16} y2={yW} stroke="#ef4444" strokeWidth="1.5" />
                    <line x1={xW} y1={yW - 16} x2={xW} y2={yW + 16} stroke="#ef4444" strokeWidth="1.5" />
                    <text x={xW + 18} y={yW + 4} fill="#ef4444" fontSize="10" fontWeight="black" fontFamily="monospace">TCP</text>
                  </g>
                );
              })()}
            </svg>

            <div className="w-full flex justify-between items-center bg-slate-900/90 px-3 py-2 rounded-lg border border-slate-800 text-[11px]">
              <span className="text-slate-400">สถานะ Servo Drives:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> READY / ALL AXES ACTIVE
              </span>
            </div>
          </div>

          {/* TCP Coordinates Box */}
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>พิกัดปลายแขนกล (TCP Cartesian Position)</span>
              <span className="text-[10px] text-amber-400 font-mono">WORLD FRAME</span>
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-700/80">
                <span className="text-[10px] text-slate-400 block">X (Front/Back)</span>
                <span className="text-sm font-black text-rose-400">{tcpX} mm</span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-700/80">
                <span className="text-[10px] text-slate-400 block">Y (Left/Right)</span>
                <span className="text-sm font-black text-emerald-400">{tcpY} mm</span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-700/80">
                <span className="text-[10px] text-slate-400 block">Z (Height)</span>
                <span className="text-sm font-black text-sky-400">{tcpZ} mm</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 pt-1 leading-normal">
              <strong>ข้อสังเกต:</strong> การหมุนแกน S (J1) เปลี่ยนทิศระนาบ X-Y ส่วนแกน L (J2) และ U (J3) ควบคุมความสูง (Z) และรัศมีเอื้อม (Reach) ขณะที่แกน R-B-T ควบคุมมุม Orientation (Roll, Pitch, Yaw) ของ Tool
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* SIMULATOR 2: SENSOR INPUTS & ACTUATOR OUTPUT LAB (Module 2)               */
/* ========================================================================= */
export function RobotSensorActuatorLab() {
  const [targetMaterial, setTargetMaterial] = useState('steel'); // steel, aluminum, plastic, water, finger
  const [targetDistance, setTargetDistance] = useState(4); // mm (1 to 20)
  const [solenoidCoil, setSolenoidCoil] = useState(false); // Air cylinder solenoid valve
  const [safetyStopPressed, setSafetyStopPressed] = useState(false);

  // Sensor response rules
  // Inductive: Ferro metals (Steel=high, Alum=medium, Plastic/Water=none)
  const isInductiveTriggered = (targetMaterial === 'steel' && targetDistance <= 6) || (targetMaterial === 'aluminum' && targetDistance <= 3);
  // Capacitive: All objects with dielectric (Steel, Alum, Plastic <= 8, Water <= 12, Finger <= 7)
  const isCapacitiveTriggered = targetDistance <= (targetMaterial === 'water' ? 12 : targetMaterial === 'steel' ? 9 : 7);
  // Photoelectric: Reflects from all non-transparent within range
  const isPhotoTriggered = targetDistance <= 15;

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 md:p-6 shadow-2xl space-y-5">
      <div className="border-b border-slate-800 pb-3">
        <span className="text-xs font-bold text-sky-400 uppercase tracking-widest px-2.5 py-1 bg-sky-400/10 rounded-full border border-sky-400/20">
          Interactive Lab 2
        </span>
        <h3 className="text-lg md:text-xl font-black text-white mt-1 flex items-center gap-2">
          <FiZap className="text-sky-400" /> ห้องทดลองเซนเซอร์อุตสาหกรรม และวาล์วกระบอกลม (Sensor & Actuator I/O)
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          เปรียบเทียบการทำงานของ Inductive vs Capacitive Proximity และทดสอบการสั่งงาน Double-Acting Cylinder ผ่านโซลินอยด์วาล์ว 5/2
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Sensors Testing Box */}
        <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> 1. ทดสอบเซนเซอร์ตรวจจับ (Sensor Input)
            </h4>
            <span className="text-xs text-slate-400 font-mono">DI: 24VDC PNP Logic</span>
          </div>

          {/* Material Selector */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-semibold block">เลือกวัสดุของชิ้นงาน (Target Material):</label>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              {[
                { id: 'steel', label: 'เหล็ก (Steel/Fe)' },
                { id: 'aluminum', label: 'อะลูมิเนียม (Al)' },
                { id: 'plastic', label: 'พลาสติก (POM/ABS)' },
                { id: 'water', label: 'ของเหลว/น้ำ (Liquid)' },
                { id: 'finger', label: 'นิ้วมือมนุษย์ (Skin)' }
              ].map(mat => (
                <button
                  key={mat.id}
                  onClick={() => setTargetMaterial(mat.id)}
                  className={`p-2 rounded-lg font-bold border transition text-center ${
                    targetMaterial === mat.id 
                      ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/20' 
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {mat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Distance Slider */}
          <div className="space-y-1 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">ระยะห่างเซนเซอร์กับชิ้นงาน (Sensing Distance):</span>
              <span className="font-mono font-bold text-sky-400">{targetDistance} mm</span>
            </div>
            <input
              type="range"
              min="1"
              max="18"
              value={targetDistance}
              onChange={e => setTargetDistance(parseInt(e.target.value))}
              className="w-full accent-sky-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>1 mm (ใกล้มาก)</span>
              <span>10 mm (ปานกลาง)</span>
              <span>18 mm (ไกลเกินระยะ)</span>
            </div>
          </div>

          {/* Sensor Logic Matrix Results */}
          <div className="space-y-2">
            <div className={`p-3 rounded-lg border transition flex items-center justify-between ${
              isInductiveTriggered ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200' : 'bg-slate-900/80 border-slate-800 text-slate-400'
            }`}>
              <div>
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isInductiveTriggered ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-600'}`}></span>
                  Inductive Proximity Sensor (DI 0.0)
                </div>
                <div className="text-[11px] text-slate-400">หลักการสนามแม่เหล็กเหนี่ยวนำ Eddy Current (ตรวจจับเฉพาะโลหะ)</div>
              </div>
              <span className={`font-mono text-xs font-black px-2 py-1 rounded ${isInductiveTriggered ? 'bg-emerald-500/30 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
                {isInductiveTriggered ? 'SIGNAL ON (24V)' : 'OFF (0V)'}
              </span>
            </div>

            <div className={`p-3 rounded-lg border transition flex items-center justify-between ${
              isCapacitiveTriggered ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200' : 'bg-slate-900/80 border-slate-800 text-slate-400'
            }`}>
              <div>
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isCapacitiveTriggered ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-600'}`}></span>
                  Capacitive Proximity Sensor (DI 0.1)
                </div>
                <div className="text-[11px] text-slate-400">หลักการประจุไฟฟ้า Dielectric Permittivity (ตรวจจับทั้งโลหะและอโลหะ)</div>
              </div>
              <span className={`font-mono text-xs font-black px-2 py-1 rounded ${isCapacitiveTriggered ? 'bg-emerald-500/30 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
                {isCapacitiveTriggered ? 'SIGNAL ON (24V)' : 'OFF (0V)'}
              </span>
            </div>
          </div>
        </div>

        {/* Pneumatic Cylinder Actuator Output */}
        <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span> 2. อุปกรณ์ควบคุมเอาต์พุต (Actuator Output)
              </h4>
              <span className="text-xs text-slate-400 font-mono">DO: 5/2 Solenoid Valve</span>
            </div>

            {/* Cylinder Visualizer */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[140px] relative">
              <div className="text-[10px] font-mono text-slate-500 absolute top-2 left-2">
                DOUBLE-ACTING PNEUMATIC CYLINDER
              </div>

              {/* Cylinder barrel */}
              <div className="w-64 h-14 bg-slate-800 rounded-lg border-2 border-slate-600 relative overflow-hidden flex items-center px-1">
                {/* Air chamber indicator */}
                <div className={`absolute top-0 bottom-0 left-0 bg-sky-500/20 transition-all duration-500 ${solenoidCoil ? 'w-48' : 'w-8'}`}></div>

                {/* Piston & Rod */}
                <div 
                  className="h-10 bg-slate-300 border-2 border-slate-400 rounded-sm relative flex items-center transition-all duration-500"
                  style={{ 
                    width: '30px', 
                    transform: solenoidCoil ? 'translateX(130px)' : 'translateX(0px)' 
                  }}
                >
                  {/* Piston Rod */}
                  <div className="absolute left-full top-3 h-4 bg-slate-400 border border-slate-200 w-36 rounded-r-md">
                    {/* Gripper attachment */}
                    <div className="absolute right-0 -top-3 w-3 h-10 bg-amber-500 rounded-r"></div>
                  </div>
                </div>

                {/* Auto switches (Reed switch DI 1.0 & DI 1.1) */}
                <div className={`absolute bottom-0.5 left-2 w-3 h-2 rounded-sm border ${!solenoidCoil ? 'bg-emerald-400 border-emerald-300 shadow-[0_0_6px_#34d399]' : 'bg-slate-700 border-slate-600'}`}></div>
                <div className={`absolute bottom-0.5 right-12 w-3 h-2 rounded-sm border ${solenoidCoil ? 'bg-emerald-400 border-emerald-300 shadow-[0_0_6px_#34d399]' : 'bg-slate-700 border-slate-600'}`}></div>
              </div>

              <div className="flex justify-between w-64 text-[10px] font-mono text-slate-400 mt-2">
                <span className={!solenoidCoil ? 'text-emerald-400 font-bold' : ''}>Reed SW1: RETRACT (DI 1.0)</span>
                <span className={solenoidCoil ? 'text-emerald-400 font-bold' : ''}>Reed SW2: EXTEND (DI 1.1)</span>
              </div>
            </div>
          </div>

          {/* Actuator Trigger Controls */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setSolenoidCoil(!solenoidCoil)}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition ${
                  solenoidCoil
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600'
                }`}
              >
                <FiZap className={solenoidCoil ? 'fill-current' : ''} />
                {solenoidCoil ? 'Solenoid Coil Y1: ON (กระบอกลมยืดออก)' : 'Solenoid Coil Y1: OFF (กระบอกลมหดกลับ)'}
              </button>
            </div>

            {/* Emergency Stop Toggle */}
            <div className="p-3 bg-rose-950/30 border border-rose-500/40 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                  <FiAlertTriangle className="text-rose-400" /> สวิตช์หยุดฉุกเฉิน (E-Stop Push-Lock / Turn-Reset)
                </div>
                <div className="text-[11px] text-slate-400">หน้าสัมผัส NC 2 ช่องทางตัดไฟ Main Air และ Servo Drive</div>
              </div>
              <button
                onClick={() => setSafetyStopPressed(!safetyStopPressed)}
                className={`px-3 py-1.5 text-xs font-black rounded-lg border transition ${
                  safetyStopPressed
                    ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/40 animate-pulse'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {safetyStopPressed ? 'E-STOP PRESSED (LOCKED)' : 'NORMAL (RESET)'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* SIMULATOR 3: DUAL-ROBOT & STAMPING PRESS HANDSHAKING SIMULATOR (Module 3) */
/* ========================================================================= */
export function RobotHandshakeSimulator() {
  const [step, setStep] = useState(0);
  const [hasCollision, setHasCollision] = useState(false);

  const steps = [
    {
      title: 'ขั้นตอนที่ 0: สภาพเริ่มต้น (Standby)',
      pressState: 'Top Dead Center (TDC - จุดสูงสุดพร้อมรับชิ้นงาน)',
      robot1State: 'Home Position (ภายนอกแม่พิมพ์)',
      pressSignal: 'Press Ready (DO 1.0 = 1)',
      robotSignal: 'Robot Standby (DO 2.0 = 0)',
      desc: 'เครื่องปั๊มโลหะเปิดช่องแม่พิมพ์เต็มที่และส่งสัญญาณ "Press Ready" ให้หุ่นยนต์เพื่ออนุญาตให้เข้าหยิบชิ้นงาน'
    },
    {
      title: 'ขั้นตอนที่ 1: หุ่นยนต์ขอเข้าพื้นที่ (Robot Enters Die Area)',
      pressState: 'Locked at TDC (ห้ามขยับลง)',
      robot1State: 'Entering Die Area (เข้าจับชิ้นงาน)',
      pressSignal: 'Press Interlock Active (รอหุ่นยนต์)',
      robotSignal: 'In Die Area (DO 2.0 = 1)',
      desc: 'หุ่นยนต์เคลื่อนที่เข้าแม่พิมพ์และส่งสัญญาณ "In Die Area = 1" ตัดวงจรสั่งเดินเครื่องปั๊มเพื่อป้องกันการทับ'
    },
    {
      title: 'ขั้นตอนที่ 2: หยิบชิ้นงานและถอยออก (Pick & Retract)',
      pressState: 'Locked at TDC (รอสัญญาณปลอดภัย)',
      robot1State: 'Retracting to Safe Zone',
      pressSignal: 'Press Waiting Safe Clearance',
      robotSignal: 'Part Gripped OK (DI 2.1 = 1)',
      desc: 'หัวจับสูญญากาศ (Vacuum) ดูดจับชิ้นงานสมบูรณ์ และแขนกลถอยร่นออกจากระยะเงื้อมแม่พิมพ์'
    },
    {
      title: 'ขั้นตอนที่ 3: หุ่นยนต์พ้นพื้นที่อันตราย (Robot Clear Signal)',
      pressState: 'Authorized to Cycle (ได้รับคำสั่งปั๊ม)',
      robot1State: 'Cleared Die Zone (DO 2.0 = 0, DO 2.2 = 1)',
      pressSignal: 'Cycle Permitted (DI 1.2 = 1)',
      robotSignal: 'Robot Safe Clear = 1 (ส่งสัญญาณให้ปั๊ม)',
      desc: 'หุ่นยนต์ส่งสัญญาณ "Robot Clear" ยืนยันว่าปลาย Tool พ้นเขตนอกแม่พิมพ์ 100% เครื่องปั๊มจึงเริ่มเคลื่อนที่ลง'
    },
    {
      title: 'ขั้นตอนที่ 4: ปั๊มขึ้นรูปเสร็จสมบูรณ์ (Stamping Stroke Complete)',
      pressState: 'Cycle Finished -> Return to TDC',
      robot1State: 'Placing Part on Conveyor',
      pressSignal: 'Cycle Finished (DO 1.3 = 1)',
      robotSignal: 'Part Placed',
      desc: 'แม่พิมพ์ปั๊มชิ้นงานเสร็จและเคลื่อนที่กลับสู่จุด TDC พร้อมเริ่มรอบการทำงานถัดไปอย่างราบรื่น'
    }
  ];

  const current = steps[step];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
      setHasCollision(false);
    } else {
      setStep(0);
      setHasCollision(false);
    }
  };

  const triggerUnsafeEntry = () => {
    setHasCollision(true);
  };

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 md:p-6 shadow-2xl space-y-5">
      <div className="border-b border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-rose-400 uppercase tracking-widest px-2.5 py-1 bg-rose-400/10 rounded-full border border-rose-400/20">
            Interactive Lab 3
          </span>
          <h3 className="text-lg md:text-xl font-black text-white mt-1 flex items-center gap-2">
            <FiRepeat className="text-rose-400" /> จำลองระบบ Handshaking Interlock (Robot vs Stamping Press)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            ทดสอบการแลกเปลี่ยนสัญญาณ I/O เพื่อป้องกันการชนกันระหว่างแขนกลกับเครื่องปั๊มขึ้นรูปโลหะ
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={triggerUnsafeEntry}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-600/50 transition flex items-center gap-1.5"
          >
            <FiAlertTriangle /> จำลองไม่รอสัญญาณ (Simulate Crash)
          </button>
          <button 
            onClick={handleNext}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
          >
            ขั้นตอนถัดไป ({step + 1}/{steps.length}) <FiArrowRight />
          </button>
        </div>
      </div>

      {hasCollision ? (
        <div className="p-4 rounded-xl bg-rose-950/90 border-2 border-rose-500 text-rose-200 space-y-2 animate-bounce">
          <div className="flex items-center gap-2 font-black text-base text-white">
            <FiAlertTriangle className="text-rose-400 text-xl" /> เกิดอุบัติเหตุแม่พิมพ์ทับแขนกล (DIE CRASH DETECTED!)
          </div>
          <p className="text-xs leading-relaxed">
            สาเหตุ: หุ่นยนต์เคลื่อนที่เข้าพื้นที่แม่พิมพ์โดยไม่รอสัญญาณ Handshake ยืนยันจากเครื่องปั๊ม (Wait For Press Ready == 1) ส่งผลให้ชุด Upper Die กระแทก End-Effector เสียหายรุนแรง ค่าซ่อมแซมแม่พิมพ์และ Tooling สูงกว่า 500,000 บาท
          </p>
          <button 
            onClick={() => setHasCollision(false)}
            className="px-3 py-1 text-xs font-bold bg-white text-rose-900 rounded-lg hover:bg-slate-200 transition"
          >
            รีเซ็ตระบบความปลอดภัย (Reset Fault)
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* State Machine Graphic */}
        <div className="lg:col-span-7 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-white">{current.title}</span>
            <span className="font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
              SAFETY INTERLOCK: ACTIVE
            </span>
          </div>

          {/* SVG Factory Cell Animation */}
          <svg viewBox="0 0 500 220" className="w-full h-44 bg-slate-900/60 rounded-lg border border-slate-800">
            {/* Press Frame */}
            <rect x="30" y="30" width="140" height="150" fill="#1e293b" stroke="#475569" strokeWidth="2" rx="4" />
            <text x="100" y="55" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold">STAMPING PRESS</text>

            {/* Upper Die Platen */}
            <rect 
              x="45" 
              y={step === 4 ? 110 : (hasCollision ? 115 : 65)} 
              width="110" 
              height="35" 
              fill={hasCollision ? "#ef4444" : "#e2e8f0"} 
              stroke="#0f172a" 
              strokeWidth="2" 
              rx="2"
              className="transition-all duration-700" 
            />
            <text x="100" y={step === 4 ? 132 : (hasCollision ? 137 : 87)} textAnchor="middle" fill="#000" fontSize="10" fontWeight="black">
              {step === 4 ? 'DOWN (STAMP)' : hasCollision ? 'COLLISION!' : 'UP (TDC)'}
            </text>

            {/* Lower Die Bed */}
            <rect x="45" y="145" width="110" height="25" fill="#64748b" stroke="#334155" strokeWidth="2" rx="2" />
            <text x="100" y="161" textAnchor="middle" fill="#fff" fontSize="9">LOWER DIE</text>

            {/* Handshake Signal Wire */}
            <path 
              d="M 170 80 C 230 80, 230 140, 290 140" 
              fill="none" 
              stroke={step >= 1 && step <= 3 ? "#38bdf8" : "#475569"} 
              strokeWidth="2" 
              strokeDasharray="4 4" 
            />
            <text x="230" y="105" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">
              I/O HANDSHAKE BUS
            </text>

            {/* Robot Base */}
            <rect x="290" y="120" width="60" height="60" fill="#334155" stroke="#64748b" strokeWidth="2" rx="4" />
            <text x="320" y="155" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">ROBOT</text>

            {/* Robot Arm */}
            <g className="transition-all duration-700">
              {step === 1 || step === 2 || hasCollision ? (
                // Inside Die Area
                <path d="M 320 120 Q 240 70 120 140" fill="none" stroke="#f59e0b" strokeWidth="8" strokeLinecap="round" />
              ) : (
                // Home / Outside Safe Area
                <path d="M 320 120 Q 360 60 410 110" fill="none" stroke="#f59e0b" strokeWidth="8" strokeLinecap="round" />
              )}
            </g>

            {/* Safety Perimeter Line */}
            <line x1="210" y1="20" x2="210" y2="190" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 3" />
            <text x="210" y="15" textAnchor="middle" fill="#f43f5e" fontSize="9" fontWeight="bold">DIE DANGER BOUNDARY</text>
          </svg>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-2.5 rounded-lg border border-slate-800">
            <strong>คำอธิบายการทำงาน:</strong> {current.desc}
          </p>
        </div>

        {/* Signal Monitor & Ladder Logic View */}
        <div className="lg:col-span-5 bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>สถานะสัญญาณคู่สาย (Handshake Register)</span>
            <span className="text-[10px] text-indigo-400 font-mono">STEP {step + 1} OF 5</span>
          </h4>

          <div className="space-y-2 text-xs font-mono">
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-700/80 space-y-1">
              <span className="text-slate-400 text-[10px] block">เครื่องปั๊มโลหะ (Stamping Press Status):</span>
              <div className="text-sky-300 font-bold">{current.pressState}</div>
              <div className="text-slate-400 text-[11px]">{current.pressSignal}</div>
            </div>

            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-700/80 space-y-1">
              <span className="text-slate-400 text-[10px] block">แขนกลหุ่นยนต์ (Robot Arm Status):</span>
              <div className="text-amber-300 font-bold">{current.robot1State}</div>
              <div className="text-slate-400 text-[11px]">{current.robotSignal}</div>
            </div>
          </div>

          {/* Golden Rule Callout */}
          <div className="bg-amber-950/40 p-3 rounded-xl border border-amber-500/40 text-[11px] text-amber-200/90 leading-normal space-y-1">
            <span className="font-bold flex items-center gap-1 text-amber-300">
              <FiCheckCircle className="text-amber-400" /> กฎเหล็ก 3 ประการของ Handshaking ใน SNC Former:
            </span>
            <p>1. หุ่นยนต์ต้อง <strong>Wait For Press_Ready == 1</strong> ก่อนก้าวข้ามเส้น Danger Boundary เสมอ</p>
            <p>2. ตราบใดที่แขนกลอยู่ในแม่พิมพ์ ต้องสั่ง <strong>DO In_Die = 1</strong> ค้างไว้ตลอดเวลา</p>
            <p>3. ต้องยืนยันว่าแขนกลพ้นแม่พิมพ์แล้วจริง ๆ ด้วย <strong>Robot_Clear = 1</strong> ก่อนปล่อยให้แม่พิมพ์กดลง</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* SIMULATOR 4: RIGHT-HAND RULE & COORDINATE FRAMES (Module 4)               */
/* ========================================================================= */
export function RobotCoordinateSimulator() {
  const [coordMode, setCoordMode] = useState('world'); // 'joint' | 'world' | 'tool'
  const [jogAxis, setJogAxis] = useState('+X');

  const getCoordData = () => {
    switch (coordMode) {
      case 'joint':
        return {
          title: 'Joint Coordinates (ระบบพิกัดข้อต่อแกน)',
          origin: 'แต่ละแกนหมุนเป็นอิสระต่อกัน (S, L, U, R, B, T ในหน่วยองศา °)',
          characteristic: 'ไม่มีจุดอ้างอิง XYZ รวม มอเตอร์แต่ละตัวหมุนตามคำสั่งโดยตรง เหมาะสำหรับจ็อกหลบสิ่งกีดขวางหรือนำหุ่นกลับ Home Position',
          thumbAxis: 'J1 / S-Axis (หมุนฐาน)',
          indexAxis: 'J2 / L-Axis (ก้มเงย)',
          middleAxis: 'J3 / U-Axis (พับเหยียด)'
        };
      case 'tool':
        return {
          title: 'Tool Coordinates (ระบบพิกัดเครื่องมือ TCP)',
          origin: 'จุดอ้างอิงอยู่ที่ปลายหัวเชื่อม/หัวดูดสูญญากาศ (Tool Center Point)',
          characteristic: '+Z ชี้พุ่งออกจากปลายเครื่องมือเสมอ มีประโยชน์สูงสุดเวลานำหุ่นยนต์เคลื่อนที่เสียบชิ้นงานตามแนวเอียง หรือเชื่อมตามรอยต่อชิ้นงาน',
          thumbAxis: '+Z Tool (ทิศพุ่งออกจากหัวเชื่อม)',
          indexAxis: '+X Tool (ทิศกว้างของปาก Gripper)',
          middleAxis: '+Y Tool (ทิศหนาของปาก Gripper)'
        };
      default:
        return {
          title: 'World Coordinates (ระบบพิกัดคาร์ทีเซียนฐานหุ่นยนต์)',
          origin: 'จุดกึ่งกลางฐานหุ่นยนต์ (Base Center X=0, Y=0, Z=0)',
          characteristic: 'แกน +X ชี้ไปด้านหน้าหุ่นยนต์, แกน +Y ชี้ไปทางซ้ายมือ, แกน +Z ชี้ตั้งตรงขึ้นสู่เพดาน เป็นพิกัดอ้างอิงสากลตามกฎมือขวา (Right-Hand Rule)',
          thumbAxis: '+Z World (ชี้ตั้งตรงขึ้นข้างบนเสมอ)',
          indexAxis: '+X World (ชี้พุ่งไปข้างหน้าหุ่นยนต์)',
          middleAxis: '+Y World (ชี้ไปทางซ้ายมือ 90 องศา)'
        };
    }
  };

  const info = getCoordData();

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 md:p-6 shadow-2xl space-y-5">
      <div className="border-b border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest px-2.5 py-1 bg-emerald-400/10 rounded-full border border-emerald-400/20">
            Interactive Lab 4
          </span>
          <h3 className="text-lg md:text-xl font-black text-white mt-1 flex items-center gap-2">
            <FiCompass className="text-emerald-400" /> กฎมือขวา (Right-Hand Rule) และระบบพิกัด 3 มิติ
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            เปรียบเทียบความแตกต่างระหว่างโหมดพิกัด Joint, World, และ Tool (TCP) ในการทำงานจริง
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          {[
            { id: 'world', label: 'World Frame' },
            { id: 'tool', label: 'Tool Frame (TCP)' },
            { id: 'joint', label: 'Joint Mode' }
          ].map(mode => (
            <button
              key={mode.id}
              onClick={() => setCoordMode(mode.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                coordMode === mode.id
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Right Hand Rule Visual 3D Frame */}
        <div className="md:col-span-6 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center relative min-h-[240px]">
          <div className="text-[10px] font-mono text-slate-500 absolute top-2 left-2">
            3D CARTESIAN ORTHOGONAL VECTORS
          </div>

          <svg viewBox="-150 -150 300 280" className="w-56 h-56">
            {/* Origin marker */}
            <circle cx="0" cy="0" r="8" fill="#64748b" />
            <text x="-18" y="-12" fill="#94a3b8" fontSize="11" fontWeight="bold">Origin (0,0,0)</text>

            {/* +Z Vector (Thumb / Up) */}
            <line x1="0" y1="0" x2="0" y2="-110" stroke="#38bdf8" strokeWidth="4" markerEnd="url(#arrow-blue)" />
            <polygon points="0,-120 -6,-105 6,-105" fill="#38bdf8" />
            <text x="12" y="-105" fill="#38bdf8" fontSize="13" fontWeight="black" fontFamily="monospace">+Z</text>
            <text x="35" y="-105" fill="#94a3b8" fontSize="10">(นิ้วโป้ง - Thumb)</text>

            {/* +X Vector (Index / Front) */}
            <line x1="0" y1="0" x2="85" y2="55" stroke="#f43f5e" strokeWidth="4" />
            <polygon points="95,62 82,48 76,59" fill="#f43f5e" />
            <text x="95" y="75" fill="#f43f5e" fontSize="13" fontWeight="black" fontFamily="monospace">+X</text>
            <text x="95" y="90" fill="#94a3b8" fontSize="10">(นิ้วชี้ - Index)</text>

            {/* +Y Vector (Middle / Left) */}
            <line x1="0" y1="0" x2="-90" y2="45" stroke="#34d399" strokeWidth="4" />
            <polygon points="-100,50 -83,52 -87,40" fill="#34d399" />
            <text x="-120" y="55" fill="#34d399" fontSize="13" fontWeight="black" fontFamily="monospace">+Y</text>
            <text x="-120" y="70" fill="#94a3b8" fontSize="10">(นิ้วกลาง - Middle)</text>
          </svg>

          <div className="w-full bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-[11px] flex justify-between">
            <span className="text-slate-400">กฎความสัมพันธ์:</span>
            <span className="text-emerald-400 font-bold font-mono">X × Y = Z (มุมฉาก 90 องศา)</span>
          </div>
        </div>

        {/* Coordinate Mode Details */}
        <div className="md:col-span-6 bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex flex-col justify-between space-y-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> {info.title}
            </h4>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              {info.characteristic}
            </p>
          </div>

          <div className="bg-slate-900 p-3 rounded-xl border border-slate-700/80 space-y-2 text-xs">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">การเทียบแกนตามกฎมือขวา:</div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <span className="text-sky-400 font-bold font-mono">แกน Z (นิ้วโป้ง):</span>
              <span className="text-slate-200">{info.thumbAxis}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <span className="text-rose-400 font-bold font-mono">แกน X (นิ้วชี้):</span>
              <span className="text-slate-200">{info.indexAxis}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-bold font-mono">แกน Y (นิ้วกลาง):</span>
              <span className="text-slate-200">{info.middleAxis}</span>
            </div>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-400">
            <strong>คำแนะนำในการ Jogging ในไลน์ผลิต:</strong> หากชิ้นงานเอียงทำมุม เช่น การหยิบชิ้นงานในแม่พิมพ์เอียง ให้เปลี่ยนจาก World Mode เป็น <strong>Tool Mode</strong> ทันที เพื่อให้การจ็อกแกน +Z ดึงหัวจับถอยออกมาตามแนวตรงของเครื่องมือโดยไม่ชนขอบแม่พิมพ์
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* SIMULATOR 5: MOTION TRAJECTORIES & SINGULARITY (Module 5)                 */
/* ========================================================================= */
export function RobotTrajectorySimulator() {
  const [motionType, setMotionType] = useState('ptp'); // 'ptp' (MOVEJ) | 'linear' (MOVEL)
  const [passSingularity, setPassSingularity] = useState(false);

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 md:p-6 shadow-2xl space-y-5">
      <div className="border-b border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-purple-400 uppercase tracking-widest px-2.5 py-1 bg-purple-400/10 rounded-full border border-purple-400/20">
            Interactive Lab 5
          </span>
          <h3 className="text-lg md:text-xl font-black text-white mt-1 flex items-center gap-2">
            <FiActivity className="text-purple-400" /> คำสั่งเคลื่อนที่ PTP (MOVEJ) vs Linear (MOVEL) และจุดเอกฐาน (Singularity)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            เปรียบเทียบโปรไฟล์ความเร็ว แนววิถีการเคลื่อนที่ และสภาวะอันตรายจากจุดเอกฐานที่ทำให้หุ่นยนต์ Alarm
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setMotionType('ptp')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
              motionType === 'ptp'
                ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            PTP / MOVEJ (แบบเร็ว/โค้ง)
          </button>
          <button
            onClick={() => setMotionType('linear')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
              motionType === 'linear'
                ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-600/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            Linear / MOVEL (เส้นตรง)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Trajectory Canvas */}
        <div className="lg:col-span-7 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-white">
              {motionType === 'ptp' ? 'Point-to-Point (MOVEJ) Trajectory' : 'Linear (MOVEL) Straight-line Path'}
            </span>
            <button
              onClick={() => setPassSingularity(!passSingularity)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded border transition ${
                passSingularity
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {passSingularity ? 'โหมดผ่าน Singularity: เปิด' : 'ทดสอบผ่าน Singularity'}
            </button>
          </div>

          <svg viewBox="0 0 450 200" className="w-full h-44 bg-slate-900/60 rounded-lg border border-slate-800">
            {/* Start Point P1 */}
            <circle cx="50" cy="140" r="8" fill="#10b981" />
            <text x="50" y="165" textAnchor="middle" fill="#34d399" fontSize="10" fontWeight="bold">Start (P1)</text>

            {/* Target Point P2 */}
            <circle cx="400" cy="60" r="8" fill="#3b82f6" />
            <text x="400" y="85" textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="bold">Target (P2)</text>

            {/* Singularity Zone */}
            {passSingularity && (
              <g>
                <circle cx="225" cy="100" r="30" fill="#ef4444" fillOpacity="0.2" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x="225" y="104" textAnchor="middle" fill="#f87171" fontSize="9" fontWeight="bold">SINGULARITY ZONE</text>
              </g>
            )}

            {/* Motion Path */}
            {motionType === 'ptp' ? (
              // Curved arc of MOVEJ
              <path 
                d="M 50 140 Q 200 10 400 60" 
                fill="none" 
                stroke="#c084fc" 
                strokeWidth="4" 
                strokeDasharray="6 3" 
              />
            ) : (
              // Straight line of MOVEL
              <line 
                x1="50" 
                y1="140" 
                x2="400" 
                y2="60" 
                stroke="#38bdf8" 
                strokeWidth="4" 
              />
            )}

            {/* Path description */}
            <text x="225" y={motionType === 'ptp' ? "45" : "135"} textAnchor="middle" fill={motionType === 'ptp' ? "#c084fc" : "#38bdf8"} fontSize="10" fontWeight="bold">
              {motionType === 'ptp' ? 'เส้นโค้งธรรมชาติของมอเตอร์ (เร็วที่สุด)' : 'วิถีเส้นตรงแท้จริง (คงที่และแม่นยำ)'}
            </text>
          </svg>

          {passSingularity && motionType === 'linear' && (
            <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/60 text-xs text-rose-200 flex items-center gap-2">
              <FiAlertTriangle className="text-rose-400 shrink-0" />
              <span>
                <strong>ALARM: WRIST SINGULARITY!</strong> แขนกลเคลื่อนที่ผ่านจุดที่แกน 4 และแกน 6 ทำมุมแนวเดียวกัน ทำให้ระบบคำนวณต้องการความเร็วรอบของข้อมือเป็นอนันต์ (Infinite Acceleration) หุ่นยนต์หยุดฉุกเฉิน
              </span>
            </div>
          )}
        </div>

        {/* Technical Comparison Table */}
        <div className="lg:col-span-5 bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            ตารางเปรียบเทียบคำสั่ง MOVEJ vs MOVEL
          </h4>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700/80 space-y-1">
              <span className="font-bold text-purple-300 block">MOVEJ / PTP (Joint Motion):</span>
              <p className="text-slate-300 text-[11px] leading-normal">
                มอเตอร์ทุกแกนออกตัวและหยุดพร้อมกัน เส้นทาง TCP จะเป็นเส้นโค้งในอากาศ <strong>ไม่มีปัญหา Singularity</strong> เหมาะสำหรับย้ายตำแหน่งในอากาศเปล่า (Air Cut / Free Transfer) เพราะทำความเร็วได้สูงสุด
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700/80 space-y-1">
              <span className="font-bold text-sky-300 block">MOVEL / Linear Motion:</span>
              <p className="text-slate-300 text-[11px] leading-normal">
                ปลาย Tool เคลื่อนที่เป็นเส้นตรงสมบูรณ์แบบ เหมาะสำหรับงานหยิบชิ้นงานออกจากแม่พิมพ์แคบ, งานเชื่อมแนวตรง, งานทากาว <strong>ข้อควรระวัง:</strong> เสี่ยงต่อการติด Singularity หากเส้นทางตัดผ่านจุดศูนย์กลางฐาน
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-200">
              <strong>เคล็ดลับจาก SNC Former:</strong> ในการเขียนโปรแกรม ให้ใช้ <strong>MOVEJ</strong> ในการเคลื่อนที่ระยะไกล และสลับมาใช้ <strong>MOVEL</strong> เฉพาะระยะ 50-100 mm สุดท้ายก่อนเข้าหยิบหรือวางชิ้นงาน
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* SIMULATOR 6: PROGRAMMING LOGIC & TOWER LAMP ENGINE (Module 6)             */
/* ========================================================================= */
export function RobotProgrammingLogicSimulator() {
  const [counterA, setCounterA] = useState(0);
  const [inputSwitch, setInputSwitch] = useState(false);
  const [targetCount, setTargetCount] = useState(3);

  // Tower lamp logic based on SNC rules:
  // Red = Error / E-Stop
  // Yellow = Idle / Wait for part (Switch == 0)
  // Green = Running (Switch == 1 and counter < target)
  // Blue = Batch Finished (counter >= target)
  const isFinished = counterA >= targetCount;
  const isRunning = inputSwitch && !isFinished;
  const isIdle = !inputSwitch && !isFinished;

  const handleStepCycle = () => {
    if (!inputSwitch) return;
    if (counterA < targetCount) {
      setCounterA(prev => prev + 1);
    }
  };

  const handleReset = () => {
    setCounterA(0);
  };

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 md:p-6 shadow-2xl space-y-5">
      <div className="border-b border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-yellow-400 uppercase tracking-widest px-2.5 py-1 bg-yellow-400/10 rounded-full border border-yellow-400/20">
            Interactive Lab 6
          </span>
          <h3 className="text-lg md:text-xl font-black text-white mt-1 flex items-center gap-2">
            <FiCpu className="text-yellow-400" /> การเขียนโปรแกรมหุ่นยนต์ ตัวแปรนับรอบ (A=A+1) และตรรกะ IF-ELSE
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            ทดสอบการประมวลผลคำสั่งเงื่อนไข เปรียบเทียบตัวแปร และการควบคุมไฟสัญญาณทาวเวอร์แลมป์ (Tower Lamp)
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 transition flex items-center gap-1"
          >
            <FiRefreshCw /> รีเซ็ตตัวแปร (A = 0)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Code & Control Panel */}
        <div className="lg:col-span-7 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <span className="text-slate-400 font-bold">ROBOT PROGRAM: CYCLE_MONITOR.SRC</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Target:</span>
              <select
                value={targetCount}
                onChange={e => setTargetCount(parseInt(e.target.value))}
                className="bg-slate-900 text-white border border-slate-700 rounded px-2 py-0.5 text-xs"
              >
                <option value={3}>3 ชิ้น</option>
                <option value={5}>5 ชิ้น</option>
                <option value={10}>10 ชิ้น</option>
              </select>
            </div>
          </div>

          {/* Pseudo-code listing with dynamic highlight */}
          <div className="space-y-1 text-slate-300 leading-relaxed bg-slate-900/90 p-3 rounded-lg border border-slate-800">
            <div className="text-slate-500">// 1. ตรวจสอบเงื่อนไขสัญญาณขาเข้าและรอบงาน</div>
            <div className={isIdle ? 'bg-amber-500/20 text-amber-300 px-1 rounded font-bold' : ''}>
              IF (DI_START_SWITCH == 0) THEN
            </div>
            <div className="pl-4 text-slate-400">DO_TOWER_YELLOW = 1; // สถานะรอชิ้นงาน (Wait)</div>
            <div className="pl-4 text-slate-400">DO_TOWER_GREEN = 0;</div>
            <div className={isRunning ? 'bg-emerald-500/20 text-emerald-300 px-1 rounded font-bold' : ''}>
              ELSE IF (COUNTER_A &lt; TARGET_COUNT) THEN
            </div>
            <div className="pl-4 text-slate-400">DO_TOWER_GREEN = 1;  // กำลังทำงานอัตโนมัติ</div>
            <div className="pl-4 text-slate-400">DO_TOWER_YELLOW = 0;</div>
            <div className="pl-4 text-amber-300 font-bold">COUNTER_A = COUNTER_A + 1; // สะสมชิ้นงาน</div>
            <div className={isFinished ? 'bg-sky-500/20 text-sky-300 px-1 rounded font-bold' : ''}>
              ELSE
            </div>
            <div className="pl-4 text-slate-400">DO_TOWER_BLUE = 1;   // ชิ้นงานเต็มพาเลท (Batch Done)</div>
            <div className="pl-4 text-slate-400">DO_TOWER_GREEN = 0;</div>
            <div>ENDIF</div>
          </div>

          {/* Interactive Simulation Trigger */}
          <div className="pt-2 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInputSwitch(!inputSwitch)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition ${
                  inputSwitch
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                DI_START_SWITCH: {inputSwitch ? 'ON (1)' : 'OFF (0)'}
              </button>
            </div>

            <button
              onClick={handleStepCycle}
              disabled={!inputSwitch || isFinished}
              className={`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 border transition ${
                inputSwitch && !isFinished
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
              }`}
            >
              <FiPlay /> ผลิตชิ้นงาน 1 รอบ (Execute Cycle)
            </button>
          </div>
        </div>

        {/* Registers & Tower Lamp Output */}
        <div className="lg:col-span-5 bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              ค่าตัวแปรในระบบ (System Registers)
            </h4>
            <div className="grid grid-cols-2 gap-2 text-center font-mono">
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-700">
                <span className="text-[10px] text-slate-400 block">COUNTER_A</span>
                <span className="text-lg font-black text-amber-400">{counterA} ชิ้น</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-700">
                <span className="text-[10px] text-slate-400 block">TARGET_COUNT</span>
                <span className="text-lg font-black text-sky-400">{targetCount} ชิ้น</span>
              </div>
            </div>
          </div>

          {/* Tower Lamp Graphic */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-around">
            <div className="flex flex-col items-center gap-1.5 bg-slate-900 px-4 py-3 rounded-xl border border-slate-700">
              {/* Red Lamp */}
              <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-600"></div>
              {/* Yellow Lamp */}
              <div className={`w-8 h-8 rounded-full border-2 transition-all ${
                isIdle ? 'bg-amber-400 border-amber-300 shadow-[0_0_15px_#f59e0b]' : 'bg-slate-800 border-slate-600'
              }`}></div>
              {/* Green Lamp */}
              <div className={`w-8 h-8 rounded-full border-2 transition-all ${
                isRunning ? 'bg-emerald-400 border-emerald-300 shadow-[0_0_15px_#10b981] animate-pulse' : 'bg-slate-800 border-slate-600'
              }`}></div>
              {/* Blue Lamp */}
              <div className={`w-8 h-8 rounded-full border-2 transition-all ${
                isFinished ? 'bg-sky-400 border-sky-300 shadow-[0_0_15px_#0284c7]' : 'bg-slate-800 border-slate-600'
              }`}></div>

              {/* Tower Lamp pole */}
              <div className="w-3 h-10 bg-slate-600 rounded-b"></div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">สถานะหลอดไฟ Tower Lamp:</div>
              <div className={isIdle ? 'text-amber-400 font-bold' : 'text-slate-500'}>● YELLOW: รอเปิดสวิตช์ / สแตนด์บาย</div>
              <div className={isRunning ? 'text-emerald-400 font-bold' : 'text-slate-500'}>● GREEN: กำลังผลิต (Running)</div>
              <div className={isFinished ? 'text-sky-400 font-bold' : 'text-slate-500'}>● BLUE: ครบยอดพาเลท (Pallet Full)</div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <strong>ตัวดำเนินการเปรียบเทียบในหุ่นยนต์:</strong> เท่ากับ (<code className="text-amber-300">=</code>), ไม่เท่ากับ (<code className="text-amber-300">&lt;&gt;</code>), น้อยกว่า (<code className="text-amber-300">&lt;</code>), มากกว่า (<code className="text-amber-300">&gt;</code>), น้อยกว่าหรือเท่ากับ (<code className="text-amber-300">&lt;=</code>), มากกว่าหรือเท่ากับ (<code className="text-amber-300">&gt;=</code>)
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* SIMULATOR 7: MATRIX PALLETIZING & TCP OFFSET (Module 7)                   */
/* ========================================================================= */
export function RobotPalletizingSimulator() {
  const rows = 3;
  const cols = 3;
  const [placedBoxes, setPlacedBoxes] = useState([0, 1]); // indexes of placed boxes
  const [pitchX, setPitchX] = useState(60); // mm
  const [pitchY, setPitchY] = useState(80); // mm

  const totalBoxes = rows * cols;

  const handleAddBox = () => {
    if (placedBoxes.length < totalBoxes) {
      setPlacedBoxes([...placedBoxes, placedBoxes.length]);
    }
  };

  const handleResetPallet = () => {
    setPlacedBoxes([]);
  };

  // Current target position formula
  const currentIdx = placedBoxes.length;
  const currentRow = Math.floor(currentIdx / cols);
  const currentCol = currentIdx % cols;
  const offsetX = currentCol * pitchX;
  const offsetY = currentRow * pitchY;

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 md:p-6 shadow-2xl space-y-5">
      <div className="border-b border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-amber-500 uppercase tracking-widest px-2.5 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">
            Interactive Lab 7
          </span>
          <h3 className="text-lg md:text-xl font-black text-white mt-1 flex items-center gap-2">
            <FiBox className="text-amber-500" /> การคำนวณพาเลทแมทริกซ์ (Matrix Palletizing) และ Position Offset
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            จำลองอัลกอริทึมจัดเรียงชิ้นงานแบบตาราง 3x3 โดยคำนวณระยะออฟเซตแบบอัตโนมัติ (Dynamic Offset Calculation)
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleResetPallet}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 transition"
          >
            ล้างพาเลท (Clear)
          </button>
          <button
            onClick={handleAddBox}
            disabled={placedBoxes.length >= totalBoxes}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition ${
              placedBoxes.length < totalBoxes
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
            }`}
          >
            <FiBox /> วางชิ้นงานถัดไป ({placedBoxes.length}/{totalBoxes})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Visual Pallet Grid */}
        <div className="md:col-span-6 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center">
          <div className="text-[10px] font-mono text-slate-500 mb-2">
            PALLET SURFACE (TOP-DOWN VIEW) - ORIGIN AT TOP-LEFT
          </div>

          <div className="grid grid-cols-3 gap-3 p-4 bg-slate-900 rounded-xl border-2 border-dashed border-slate-700 w-full max-w-[280px]">
            {Array.from({ length: totalBoxes }).map((_, idx) => {
              const isPlaced = placedBoxes.includes(idx);
              const isNext = idx === placedBoxes.length;
              return (
                <div
                  key={idx}
                  className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center transition-all duration-300 relative ${
                    isPlaced
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/10'
                      : isNext
                      ? 'bg-sky-500/10 border-sky-400 border-dashed text-sky-400 animate-pulse'
                      : 'bg-slate-800/40 border-slate-700 text-slate-600'
                  }`}
                >
                  <span className="text-[10px] font-mono font-bold">#{idx + 1}</span>
                  {isPlaced ? (
                    <FiBox className="text-base text-amber-400 mt-1" />
                  ) : isNext ? (
                    <span className="text-[9px] font-bold">NEXT</span>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-3 text-[11px] text-slate-400 font-mono">
            Origin Point: P[0] (Base Reference)
          </div>
        </div>

        {/* Math & Offset Calculations */}
        <div className="md:col-span-6 bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              สูตรคณิตศาสตร์คำนวณตำแหน่งพิกัดเป้าหมาย (Offset Formula)
            </h4>
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-700/80 font-mono text-xs text-amber-300 space-y-1">
              <div>P_target.X = P_origin.X + (Col × Pitch_X)</div>
              <div>P_target.Y = P_origin.Y + (Row × Pitch_Y)</div>
              <div>P_target.Z = P_origin.Z + (Layer × Box_Height)</div>
            </div>
          </div>

          {currentIdx < totalBoxes ? (
            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-700 space-y-2 text-xs">
              <span className="text-sky-300 font-bold block">คำนวณตำแหน่งชิ้นงานที่ #{currentIdx + 1}:</span>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div>แถว (Row index): <strong className="text-white">{currentRow}</strong></div>
                <div>คอลัมน์ (Col index): <strong className="text-white">{currentCol}</strong></div>
                <div>Offset ΔX: <strong className="text-emerald-400">+{offsetX} mm</strong></div>
                <div>Offset ΔY: <strong className="text-emerald-400">+{offsetY} mm</strong></div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-bold flex items-center gap-2">
              <FiCheckCircle className="text-emerald-400 text-lg" /> พาเลทบรรจุครบจำนวนแล้ว 9/9 ชิ้น (Pallet Full)
            </div>
          )}

          <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <strong>ลำดับ 8 จังหวะการหยิบวาง (8-Step Pick &amp; Place):</strong><br />
            P0: Home → P1: Approach Pick → P2: Grip Part → P3: Retract Pick → P4: Approach Pallet → P5: Place Box → P6: Retract Pallet → P7: Clear
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* SIMULATOR 8: 3-POSITION DEADMAN SWITCH & SAFETY LAB (Module 8)            */
/* ========================================================================= */
export function RobotSafetyMaintenanceLab() {
  const [switchPosition, setSwitchPosition] = useState(1); // 1 = Released, 2 = Center (Active), 3 = Squeezed (Panic)
  const [gateOpen, setGateOpen] = useState(false);

  // Motor drive enable conditions:
  // Must be in Position 2 AND Safety Gate must be Closed
  const isDriveEnabled = switchPosition === 2 && !gateOpen;

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 md:p-6 shadow-2xl space-y-5">
      <div className="border-b border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-rose-500 uppercase tracking-widest px-2.5 py-1 bg-rose-500/10 rounded-full border border-rose-500/20">
            Interactive Lab 8
          </span>
          <h3 className="text-lg md:text-xl font-black text-white mt-1 flex items-center gap-2">
            <FiShield className="text-rose-500" /> สวิตช์นิรภัย 3 จังหวะ (3-Position Enabling Device) และประตูเซฟตี้
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            มาตรฐานความปลอดภัย ISO 10218-1 สำหรับการทำงานในโหมด Manual T1 (Teaching Pendant)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Deadman Switch Interactive Mechanism */}
        <div className="md:col-span-6 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-white">ทดสอบสวิตช์มือจับด้านหลัง Teach Pendant</span>
            <span className="text-[10px] font-mono text-slate-400">DEADMAN SWITCH</span>
          </div>

          {/* 3 Positions Selector */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { pos: 1, label: 'Position 1: ปล่อยมือ', desc: 'Released (OFF)' },
              { pos: 2, label: 'Position 2: บีบครึ่งเดียว', desc: 'Center (ENABLING)' },
              { pos: 3, label: 'Position 3: บีบแน่นสุด', desc: 'Squeezed (PANIC STOP)' }
            ].map(item => (
              <button
                key={item.pos}
                onClick={() => setSwitchPosition(item.pos)}
                className={`p-2.5 rounded-xl border text-left transition ${
                  switchPosition === item.pos
                    ? item.pos === 2
                      ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200'
                      : 'bg-rose-600/30 border-rose-400 text-rose-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="text-xs font-black">{item.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{item.desc}</div>
              </button>
            ))}
          </div>

          {/* Teach Pendant Backside Illustration */}
          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-center space-y-2">
            <div className="text-xs text-slate-300">
              สถานะสวิตช์ Deadman ปัจจุบัน:{' '}
              <strong className={switchPosition === 2 ? 'text-emerald-400' : 'text-rose-400'}>
                {switchPosition === 1 && 'ตำแหน่งที่ 1: ปล่อยมือ (หน้าสัมผัสเปิด - ตัดไฟ Servo)'}
                {switchPosition === 2 && 'ตำแหน่งที่ 2: บีบตรงกลางพอดี (Servo Ready - สั่งขยับหุ่นยนต์ได้)'}
                {switchPosition === 3 && 'ตำแหน่งที่ 3: บีบสุดด้วยความตกใจ (หน้าสัมผัสตัด - Safety Stop)'}
              </strong>
            </div>

            {/* Safety Gate Interlock Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400">ประตูกรงนิรภัย (Safety Fence Gate):</span>
              <button
                onClick={() => setGateOpen(!gateOpen)}
                className={`px-3 py-1 rounded text-xs font-bold border transition flex items-center gap-1.5 ${
                  gateOpen
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {gateOpen ? <><FiUnlock /> ประตูเปิดอยู่ (Gate Open)</> : <><FiLock /> ประตูปิดล็อค (Gate Closed)</>}
              </button>
            </div>
          </div>
        </div>

        {/* Servo Drive Interlock Status */}
        <div className="md:col-span-6 bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              สถานะไฟเลี้ยงมอเตอร์ขับเคลื่อน (Servo Power Status)
            </h4>

            <div className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
              isDriveEnabled
                ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                : 'bg-rose-950/60 border-rose-500/60 text-rose-200'
            }`}>
              <div className={`w-4 h-4 rounded-full ${isDriveEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></div>
              <div>
                <div className="text-sm font-black">
                  {isDriveEnabled ? 'SERVO DRIVES: POWER ON (อนุญาตให้ขยับแขนกล)' : 'SERVO DRIVES: INTERLOCKED (ตัดไฟกำลัง)'}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {isDriveEnabled 
                    ? 'สวิตช์ Enabling อยู่ตำแหน่งกลาง และประตูรั้วนิรภัยปิดเรียบร้อย'
                    : gateOpen 
                    ? 'สาเหตุตัดไฟ: ประตูกรงนิรภัยเปิดออก (Safety Gate Interlock Tripped)'
                    : 'สาเหตุตัดไฟ: สวิตช์ Deadman ไม่ได้อยู่ในตำแหน่งที่ 2'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1.5 text-xs">
            <span className="font-bold text-amber-300 block">ตารางการบำรุงรักษาเชิงป้องกัน (PM Checklist):</span>
            <div className="text-slate-300 text-[11px] space-y-1">
              <div>• <strong>รายวัน (Daily):</strong> เช็คแรงดันลม &gt; 0.5 MPa, เสียงลูกปืนผิดปกติ, สายไฟหน้าแปลน Tool</div>
              <div>• <strong>ทุก 3 เดือน (Quarterly):</strong> ตรวจสอบแรงบิดน็อตยึดฐานหุ่นยนต์ (Anchor Bolts), แบตเตอรี่ Encoder</div>
              <div>• <strong>ทุก 1 ปี / 10,000 ชม. (Annual):</strong> ถ่ายเปลี่ยนจาระบี Harmonic Drive &amp; RV Reducer ทุกแกน</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* MODULE 1: 6-AXIS ARCHITECTURE & 10 SKILLS ROBOT                           */
/* ========================================================================= */
export function RobotMod1() {
  return (
    <div className="space-y-8 text-slate-200">
      {/* Module Banner */}
      <div className="bg-gradient-to-r from-amber-950/70 via-orange-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-amber-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-3 border border-amber-500/30">
          <FiCpu className="w-4 h-4" /> โมดูลที่ 1 (Module 1)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          สถาปัตยกรรมหุ่นยนต์ 6 แกน (S/L/U/R/B/T) และมาตรฐาน 10 Skills Robot
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          เรียนรู้โครงสร้างพื้นฐานของแขนกลอุตสาหกรรม (Manipulator), ตู้ควบคุม (Controller), 
          Teach Pendant และหน้าที่ของข้อต่อทั้ง 6 แกน พร้อมมาตรฐานการฝึกอบรม 10 ทักษะช่างหุ่นยนต์อุตสาหกรรม
        </p>
      </div>

      {/* Section 1: Robot Definition & Triad Components */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-amber-600/30 text-amber-400 flex items-center justify-center text-sm font-black border border-amber-500/40">1</span>
          องค์ประกอบหลัก 3 ส่วนของระบบหุ่นยนต์อุตสาหกรรม
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-amber-300 text-sm">1. หุ่นยนต์ (Robot Manipulator)</h3>
            <p className="text-slate-300 leading-relaxed">
              โครงสร้างทางกลที่มีมอเตอร์ขับเคลื่อน AC Servomotor และชุดลดรอบความแม่นยำสูง (RV Reducer / Harmonic Drive) ทำหน้าที่เคลื่อนไหวหยิบจับชิ้นงานตาม 6 องศาอิสระ
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-orange-300 text-sm">2. ตู้ควบคุม (Robot Controller)</h3>
            <p className="text-slate-300 leading-relaxed">
              สมองกลส่วนกลาง บรรจุหน่วยประมวลผล CPU, Servo Drives, Safety Board, บอร์ดขยายสัญญาณ I/O และหม้อแปลงไฟฟ้า ทำหน้าที่ประมวลผลเส้นทางและคำนวณ Kinematics
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-yellow-300 text-sm">3. แป้นควบคุม (Teach Pendant)</h3>
            <p className="text-slate-300 leading-relaxed">
              อุปกรณ์พกพาสำหรับโปรแกรมเมอร์ ใช้ในการจ็อกแขนกล (Jogging), บันทึกจุดพิกัด (Teaching), เขียนโค้ดโปรแกรม, และตรวจสอบสัญญาณเตือน Alarm
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: 6 Axes Explanation */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-amber-600/30 text-amber-400 flex items-center justify-center text-sm font-black border border-amber-500/40">2</span>
          บทบาทหน้าที่ของแกนทั้ง 6 (S, L, U, R, B, T)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {[
            { axis: 'S (Swivel / J1)', desc: 'หมุนฐานลำตัวแนวนอน (ซ้าย-ขวา)', tag: 'Positioning' },
            { axis: 'L (Lower Arm / J2)', desc: 'ยกแขนท่อนล่าง (ก้ม-เงย)', tag: 'Positioning' },
            { axis: 'U (Upper Arm / J3)', desc: 'ยกแขนท่อนบน (พับ-เหยียด)', tag: 'Positioning' },
            { axis: 'R (Roll / J4)', desc: 'บิดหมุนลำแขนท่อนปลาย', tag: 'Orientation' },
            { axis: 'B (Bend / J5)', desc: 'หักข้อมือขึ้น-ลง (Pitch)', tag: 'Orientation' },
            { axis: 'T (Turn / J6)', desc: 'หมุนหน้าแปลนติดตั้ง Tool', tag: 'Orientation' }
          ].map((item, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 space-y-1">
              <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">{item.tag}</span>
              <h4 className="font-black text-white text-xs mt-1">{item.axis}</h4>
              <p className="text-slate-400 text-[11px] leading-tight">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Simulator 1 Embed */}
      <RobotJointJoggerSimulator />

      {/* Section 3: 10 Skills Framework */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-amber-600/30 text-amber-400 flex items-center justify-center text-sm font-black border border-amber-500/40">3</span>
          กรอบมาตรฐาน 10 ทักษะช่างหุ่นยนต์อุตสาหกรรม (10 SKILLS ROBOT)
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          ตามแนวทางการยกระดับทักษะแรงงานอุตสาหกรรม SNC Former และสถาบัน ARAI Academy 
          วิศวกรผู้ควบคุมและโปรแกรมหุ่นยนต์ต้องมีความเชี่ยวชาญครบถ้วนใน 10 มิติ:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {[
            '1. ความปลอดภัยและการเปิดปิดระบบ (Safety & Power Sequence)',
            '2. สถาปัตยกรรมฮาร์ดแวร์และการ Jogging แกน S/L/U/R/B/T',
            '3. ระบบพิกัด 3 มิติ (Joint, World, Tool TCP, User Frame)',
            '4. คำสั่งการเคลื่อนที่ (MOVEJ, MOVEL, MOVEC & Velocity)',
            '5. สัญญาณไฟฟ้า I/O ดิจิทัล (Sensor Inputs & Valve Outputs)',
            '6. โปรโตคอล Handshaking และวงจรป้องกันการชน (Interlock)',
            '7. ตัวแปร คณิตศาสตร์ และตัวนับรอบงาน (A = A + 1)',
            '8. ตรรกะโปรแกรมเงื่อนไข (IF - ELSE IF - ELSE Logic)',
            '9. การปรับจูน TCP และฟังก์ชันเลื่อนตำแหน่ง (Position Offset)',
            '10. ระบบจัดเรียงชิ้นงานบนพาเลท (Matrix Palletizing Integration)'
          ].map((skill, idx) => (
            <div key={idx} className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-800/60 border border-slate-700/60">
              <FiCheckCircle className="text-amber-400 shrink-0" />
              <span className="text-slate-200 font-semibold">{skill}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ========================================================================= */
/* MODULE 2: SENSORS & ELECTRICAL I/O                                        */
/* ========================================================================= */
export function RobotMod2() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-sky-950/70 via-indigo-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-sky-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold mb-3 border border-sky-500/30">
          <FiZap className="w-4 h-4" /> โมดูลที่ 2 (Module 2)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          ระบบเซนเซอร์และอุปกรณ์ไฟฟ้า INPUT - OUTPUT ในสายการผลิต
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          ทำความเข้าใจอุปกรณ์นำเข้าสัญญาณตรวจจับ (Sensors &amp; Switches), อุปกรณ์สั่งการ (Actuator Outputs), 
          วงจรควบคุมกระบอกลมนิวแมติกส์ และมาตรฐานความปลอดภัยสวิตช์หยุดฉุกเฉิน (Emergency Stop)
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-sky-600/30 text-sky-400 flex items-center justify-center text-sm font-black border border-sky-500/40">1</span>
          ประเภทของเซนเซอร์ตรวจจับ (Input Sensors)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-sky-300 text-sm">1. Inductive Proximity</h3>
            <p className="text-slate-300 leading-relaxed">
              ใช้หลักการสูญเสียกระแสวน (Eddy Current Loss) ตรวจจับได้เฉพาะ <strong>วัสดุที่เป็นโลหะตัวนำไฟฟ้า</strong> (เหล็ก, สแตนเลส, ทองเหลือง) มีความทนทานต่อน้ำมันหล่อเย็นและฝุ่นในโรงงานสูงมาก
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-indigo-300 text-sm">2. Capacitive Proximity</h3>
            <p className="text-slate-300 leading-relaxed">
              ใช้หลักการวัดค่าประจุไฟฟ้าและความเหนี่ยวนำไดอิเล็กทริก สามารถตรวจจับได้ทั้ง <strong>โลหะและอโลหะ</strong> เช่น พลาสติก, ไม้, ของเหลว, แก้ว นิยมใช้ตรวจวัดระดับเม็ดพลาสติกและของเหลว
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-purple-300 text-sm">3. Photoelectric Sensor</h3>
            <p className="text-slate-300 leading-relaxed">
              ใช้ลำแสงอินฟราเรดหรือเลเซอร์ มี 3 รูปแบบหลัก: ตัวรับ-ตัวส่งแยกกัน (Through-beam), สะท้อนแผ่นสะท้อน (Retro-reflective), และสะท้อนตัววัตถุ (Diffuse) ตรวจจับระยะไกลได้หลายเมตร
            </p>
          </div>
        </div>
      </section>

      <RobotSensorActuatorLab />

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-sky-600/30 text-sky-400 flex items-center justify-center text-sm font-black border border-sky-500/40">2</span>
          อุปกรณ์เอาต์พุต (Actuators) ในระบบอัตโนมัติ
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-amber-300 text-sm">วาล์วควบคุมลม 5/2 (5/2-Way Solenoid Valve)</h3>
            <p className="text-slate-300 leading-relaxed">
              วาล์ว 5 รู 2 ตำแหน่ง สำหรับควบคุมกระบอกลมสองทิศทาง (Double-Acting Cylinder):
              เมื่อจ่ายไฟ 24V เข้าคอยล์ ลมจะดันลูกสูบยืดออก เมื่อตัดไฟ สปริงหรือคอยล์อีกข้างจะดันลูกสูบหดกลับ
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-emerald-300 text-sm">สวิตช์ไฟหอคอย (Signal Tower Lamp)</h3>
            <p className="text-slate-300 leading-relaxed">
              แสดงสถานะการทำงานของไลน์ผลิตตามสีมาตรฐาน:
              <br />• <strong>สีแดง (Red):</strong> เกิดสัญญาณเตือน ข้อผิดพลาด หรือกด E-Stop
              <br />• <strong>สีเหลือง (Yellow):</strong> เครื่องจักรสแตนด์บาย รอรับชิ้นงาน
              <br />• <strong>สีเขียว (Green):</strong> หุ่นยนต์กำลังทำงานอัตโนมัติ
              <br />• <strong>สีน้ำเงิน (Blue):</strong> ชิ้นงานเต็มพาเลท / แจ้งเบิกวัตถุดิบ
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ========================================================================= */
/* MODULE 3: HANDSHAKING & INTERLOCKS                                        */
/* ========================================================================= */
export function RobotMod3() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-rose-950/70 via-indigo-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-rose-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold mb-3 border border-rose-500/30">
          <FiRepeat className="w-4 h-4" /> โมดูลที่ 3 (Module 3)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          วงจรควบคุมสัญญาณ I/O และการทำ Handshaking ป้องกันการชน
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          สถาปัตยกรรมการสื่อสารระหว่างหุ่นยนต์กับเครื่องจักรภายนอก (Robot-to-Machine Interfacing) 
          การป้องกันอุบัติเหตุในแม่พิมพ์ปั๊มขึ้นรูป (Stamping Die) และการแบ่งปันพื้นที่ทำงานของหุ่นยนต์คู่ (Dual-Robot Interlock)
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-rose-600/30 text-rose-400 flex items-center justify-center text-sm font-black border border-rose-500/40">1</span>
          หลักการพื้นฐานของ Handshaking Protocol
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          ในระบบอัตโนมัติ ห้ามหุ่นยนต์และเครื่องจักรทำงานตามเวลา (Timer-based) โดยเด็ดขาด 
          เนื่องจากความล่าช้าเพียง 0.1 วินาทีอาจนำไปสู่การชนกันอย่างรุนแรง ทุกการเคลื่อนที่ต้องยืนยันสถานะด้วยสัญญาณจริง (Sensor Confirmation Handshake):
        </p>
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-amber-300 space-y-1">
          <div>1. Machine: "ฉันอยู่ที่จุดปลอดภัยแล้ว พร้อมให้หุ่นยนต์เข้า" (Send Signal: Ready = 1)</div>
          <div>2. Robot: ตรวจสอบพบสัญญาณ Ready == 1 จึงเริ่มเคลื่อนที่เข้าพื้นที่</div>
          <div>3. Robot: ส่งสัญญาณยืนยัน "ฉันกำลังอยู่ในพื้นที่อันตราย ห้ามขยับ!" (Send Signal: In_Zone = 1)</div>
          <div>4. Machine: ตรวจพบ In_Zone == 1 ทำการล็อคระบบขับเคลื่อน (Lock Actuator)</div>
          <div>5. Robot: หยิบชิ้นงานเสร็จ ถอยออกสู่เขตปลอดภัย และส่งสัญญาณ (Send Signal: Robot_Clear = 1)</div>
          <div>6. Machine: ปลดล็อคและเริ่มรอบการผลิตถัดไป</div>
        </div>
      </section>

      <RobotHandshakeSimulator />
    </div>
  );
}

/* ========================================================================= */
/* MODULE 4: 3D COORDINATES & RIGHT-HAND RULE                                */
/* ========================================================================= */
export function RobotMod4() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-emerald-950/70 via-teal-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-emerald-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-3 border border-emerald-500/30">
          <FiCompass className="w-4 h-4" /> โมดูลที่ 4 (Module 4)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          ระบบพิกัด 3 มิติ กฎมือขวา และโหมดการเคลื่อนที่ (Joint, World, Tool TCP)
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          ทำความเข้าใจทิศทางแกนตามกฎมือขวาสากล (Right-Hand Rule) การแปลงพิกัดคาร์ทีเซียน 
          และข้อแตกต่างในการบังคับหุ่นยนต์ระหว่าง Joint Coordinate, World Base, และ Tool Frame
        </p>
      </div>

      <RobotCoordinateSimulator />

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center text-sm font-black border border-emerald-500/40">1</span>
          การเลือกใช้โหมดพิกัดให้ถูกต้องกับงาน
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-emerald-300 text-sm">Joint Mode</h3>
            <p className="text-slate-300 leading-relaxed">
              ใช้สำหรับ <strong>จ็อกหลบสิ่งกีดขวาง</strong> หรือนำหุ่นยนต์กลับจุด Home เมื่อหุ่นยนต์ติด Singularity หรือตำแหน่งคาร์ทีเซียนคำนวณไม่ออก
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-sky-300 text-sm">World Mode</h3>
            <p className="text-slate-300 leading-relaxed">
              ใช้สำหรับ <strong>เคลื่อนที่ทั่วไปในโรงงาน</strong> เช่น เลื่อนไปข้างหน้าตามแนวสายพาน (+X) หรือยกสูงขึ้นตรง ๆ ในแนวดิ่ง (+Z)
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-indigo-300 text-sm">Tool Mode (TCP)</h3>
            <p className="text-slate-300 leading-relaxed">
              ใช้สำหรับ <strong>งานที่ต้องการแนวเอียงตามเครื่องมือ</strong> เช่น ดึงลวดเชื่อมออกจากแนวเชื่อม หรือดึงหัวจับสุญญากาศออกจากชิ้นงานที่วางเอียง
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ========================================================================= */
/* MODULE 5: MOTION TRAJECTORIES & SINGULARITY                               */
/* ========================================================================= */
export function RobotMod5() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-purple-950/70 via-indigo-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-purple-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold mb-3 border border-purple-500/30">
          <FiActivity className="w-4 h-4" /> โมดูลที่ 5 (Module 5)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          รูปแบบเส้นทางการเคลื่อนที่ (PTP / MOVEJ vs MOVEL &amp; Singularity)
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          วิเคราะห์ความแตกต่างของเส้นทางการเคลื่อนที่แบบข้อต่อ (Joint Motion) เทียบกับแบบเส้นตรง (Linear Interpolation) 
          และเทคนิคการหลีกเลี่ยงจุดเอกฐานข้อมือ (Wrist Singularity) ที่ทำให้หุ่นยนต์หยุดชะงัก
        </p>
      </div>

      <RobotTrajectorySimulator />

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-purple-600/30 text-purple-400 flex items-center justify-center text-sm font-black border border-purple-500/40">1</span>
          วิธีแก้ปัญหาเมื่อหุ่นยนต์ติดจุดเอกฐาน (Singularity Prevention)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-purple-300 text-sm">1. ปรับมุมองศาของเครื่องมือเล็กน้อย (Tilt Tool)</h3>
            <p className="text-slate-300 leading-relaxed">
              เอียงแกน B (J5) ออกจากแนวดิ่ง 5° ถึง 10° เพื่อไม่ให้แกน 4 (R) และแกน 6 (T) ซ้อนทับเป็นเส้นตรงเดียวกัน ซึ่งช่วยขจัดจุดเอกฐานข้อมือได้อย่างเด็ดขาด
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-indigo-300 text-sm">2. เปลี่ยนคำสั่งเป็น MOVEJ ข้ามจุดวิกฤต</h3>
            <p className="text-slate-300 leading-relaxed">
              หากเส้นทางต้องผ่านบริเวณเหนือฐานหุ่นยนต์โดยตรง ให้เปลี่ยนคำสั่งจาก MOVEL มาเป็น MOVEJ เพราะ MOVEJ คำนวณเป็นมุมองศามอเตอร์โดยตรง จึงไม่มีทางติด Singularity
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ========================================================================= */
/* MODULE 6: PROGRAMMING LOGIC & TOWER LAMP                                  */
/* ========================================================================= */
export function RobotMod6() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-yellow-950/70 via-amber-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-yellow-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-xs font-bold mb-3 border border-yellow-500/30">
          <FiCpu className="w-4 h-4" /> โมดูลที่ 6 (Module 6)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          การเขียนโปรแกรมหุ่นยนต์ ตัวแปร คณิตศาสตร์ และตรรกะเงื่อนไข (IF-ELSE)
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          โครงสร้างภาษาโปรแกรมหุ่นยนต์อุตสาหกรรม, ตัวแปรนับรอบชิ้นงาน (A = A + 1), 
          ตัวดำเนินการทางคณิตศาสตร์และเปรียบเทียบ (=, &lt;&gt;, &lt;, &gt;, &lt;=, &gt;=) และการสั่งควบคุมไฟสถานะ Tower Lamp
        </p>
      </div>

      <RobotProgrammingLogicSimulator />

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-yellow-600/30 text-yellow-400 flex items-center justify-center text-sm font-black border border-yellow-500/40">1</span>
          ประเภทตัวแปรสำคัญในระบบควบคุมหุ่นยนต์
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
            <span className="font-mono text-amber-300 font-bold">Integer (จำนวนเต็ม)</span>
            <p className="text-slate-400 text-[11px]">ใช้เป็นตัวนับรอบงาน เช่น A = A + 1, Batch_Count</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
            <span className="font-mono text-sky-300 font-bold">Real / Float (ทศนิยม)</span>
            <p className="text-slate-400 text-[11px]">ใช้เก็บค่าน้ำหนัก, อุณหภูมิ, หรือระยะคำนวณ Offset</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
            <span className="font-mono text-emerald-300 font-bold">Boolean (ตรรกะบิต)</span>
            <p className="text-slate-400 text-[11px]">สัญญาณ I/O จริง เช่น DI_Part_Ready, DO_Grip_ON</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
            <span className="font-mono text-purple-300 font-bold">Position (พิกัด)</span>
            <p className="text-slate-400 text-[11px]">เก็บข้อมูลพิกัด P[1] = (X, Y, Z, Rx, Ry, Rz)</p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ========================================================================= */
/* MODULE 7: MATRIX PALLETIZING & TCP OFFSET                                 */
/* ========================================================================= */
export function RobotMod7() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-amber-950/70 via-orange-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-amber-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-3 border border-amber-500/30">
          <FiBox className="w-4 h-4" /> โมดูลที่ 7 (Module 7)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          การคำนวณ TCP, การ Offset ตำแหน่ง และระบบจัดเรียงพาเลท (Palletizing)
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          หลักการสอบเทียบจุดศูนย์กลางเครื่องมือ Tool Center Point (TCP), การใช้ฟังก์ชัน Position Offset, 
          และอัลกอริทึมจัดเรียงกล่องแบบแถว-คอลัมน์-ชั้น (Matrix Palletizing Formula) ในสายการผลิตจริง
        </p>
      </div>

      <RobotPalletizingSimulator />

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-amber-600/30 text-amber-400 flex items-center justify-center text-sm font-black border border-amber-500/40">1</span>
          การสอบเทียบจุดศูนย์กลางเครื่องมือ (TCP 4-Point Calibration)
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          TCP (Tool Center Point) คือจุดที่หุ่นยนต์ใช้เป็นจุดอ้างอิงในการคำนวณตำแหน่ง XYZ:
        </p>
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
          <div className="font-mono text-amber-300 font-bold">สมการพิกัด: TCP = T(J_i)</div>
          <p className="leading-relaxed">
            วิธีการสอน 4 จุด: ผู้ควบคุมจะนำปลายเครื่องมือ (เช่น ปลายลวดเชื่อม หรือปลายเข็ม) 
            มาแตะที่จุดยอดแหลมคงที่เดิมจาก 4 ทิศทางที่แตกต่างกัน เพื่อให้คอนโทรลเลอร์คำนวณเวกเตอร์ระยะห่าง (X, Y, Z Offset) จากกึ่งกลางหน้าแปลนแกน 6 (Flange Center) ได้อย่างแม่นยำระดับ 0.1 มม.
          </p>
        </div>
      </section>
    </div>
  );
}

/* ========================================================================= */
/* MODULE 8: SAFETY STANDARDS & PREVENTIVE MAINTENANCE                       */
/* ========================================================================= */
export function RobotMod8() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-rose-950/70 via-red-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-rose-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold mb-3 border border-rose-500/30">
          <FiShield className="w-4 h-4" /> โมดูลที่ 8 (Module 8)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          มาตรฐานความปลอดภัยสากล ISO 10218, Deadman Switch และการบำรุงรักษา
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          ข้อกำหนดความปลอดภัยมาตรฐาน ISO 10218 และ ISO/TS 15066, การทำงานของสวิตช์ Enabling 3 ตำแหน่ง, 
          ขั้นตอนการหยุดฉุกเฉิน, และแผนการบำรุงรักษาเชิงป้องกัน (PM) เพื่อยืดอายุการใช้งานหุ่นยนต์
        </p>
      </div>

      <RobotSafetyMaintenanceLab />

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-rose-600/30 text-rose-400 flex items-center justify-center text-sm font-black border border-rose-500/40">1</span>
          ความปลอดภัยระดับมาตรฐานสากล ISO 10218-1 &amp; 10218-2
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-rose-300 text-sm">1. โหมด T1 (Reduced Speed)</h3>
            <p className="text-slate-300 leading-relaxed">
              เมื่อเปิดประตูเข้าไปสอนหุ่นยนต์ ความเร็วของ TCP จะถูกจำกัดไว้ที่ <strong>ไม่เกิน 250 mm/s</strong> เสมอ เพื่อให้ผู้ปฏิบัติงานมีเวลาตอบสนองหากเกิดการเคลื่อนที่ผิดปกติ
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-amber-300 text-sm">2. Dual Channel Safety Relay</h3>
            <p className="text-slate-300 leading-relaxed">
              วงจรความปลอดภัยของ E-Stop และ Interlock ต้องเป็น <strong>แบบคู่ขนาน 2 ช่องสัญญาณ (Redundant Channels)</strong> หากสายไฟเส้นใดเส้นหนึ่งขาดหรือลัดวงจร ระบบจะตรวจจับความไม่สมดุลและตัดไฟทันที
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-emerald-300 text-sm">3. Lockout - Tagout (LOTO)</h3>
            <p className="text-slate-300 leading-relaxed">
              ก่อนทำการซ่อมบำรุงหรือเข้าไปเปลี่ยนอะไหล่ในเซลล์หุ่นยนต์ ต้องทำการล็อคเบรกเกอร์ไฟฟ้าหลักและปลดวาล์วลมพร้อมแขวนป้ายเตือนอันตรายทุกครั้ง
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}



/* ========================================================================= */
/* SIMULATOR 9: COBOT DIRECT TEACHING & FORCE-LIMITING LAB (Module 9)        */
/* ========================================================================= */
export function RobotCobotDirectTeachingSimulator() {
  const { isDark } = useTheme();
  const [mode, setMode] = useState('cobot'); // 'caged' | 'cobot'
  const [handGuiding, setHandGuiding] = useState(false);
  const [speedLimit, setSpeedLimit] = useState(250); // mm/s
  const [impactForce, setImpactForce] = useState(45); // N (threshold 150N)
  const [distanceToHuman, setDistanceToHuman] = useState(1.8); // meters

  // Safety status evaluation based on ISO/TS 15066
  let safetyStatus = 'NORMAL_OPERATION';
  let statusColor = isDark 
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' 
    : 'text-emerald-900 bg-emerald-50 border-emerald-300 font-bold';
  let statusText = 'ทำงานปกติ (Normal Collaborative Mode)';

  if (impactForce > 140) {
    safetyStatus = 'FORCE_EXCEEDED_STOP';
    statusColor = isDark 
      ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' 
      : 'text-rose-900 bg-rose-50 border-rose-300 font-bold';
    statusText = 'หยุดฉุกเฉิน (Protective Stop - แรงปะทะเกินเกณฑ์ ISO 15066 >140N)';
  } else if (distanceToHuman < 0.5 && speedLimit > 150) {
    safetyStatus = 'SEPARATION_VIOLATION';
    statusColor = isDark 
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' 
      : 'text-amber-900 bg-amber-50 border-amber-300 font-bold';
    statusText = 'เตือนระยะปลอดภัย (Speed & Separation Monitoring: ลดความเร็วอัตโนมัติ)';
  } else if (handGuiding) {
    safetyStatus = 'HAND_GUIDING_ACTIVE';
    statusColor = isDark 
      ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' 
      : 'text-cyan-900 bg-cyan-50 border-cyan-300 font-bold';
    statusText = 'กำลังสอนด้วยมือ (Direct Hand Guiding Active)';
  }

  return (
    <div className={`border rounded-2xl p-4 sm:p-6 space-y-6 transition-all ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
    }`}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <FiShield className="w-5 h-5 text-teal-500" />
            ห้องแล็บจำลอง Cobot Direct Teaching & Safety PFL (ISO/TS 15066)
          </h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            ทดสอบการทำงานของหุ่นยนต์ร่วมปฏิบัติการ (Cobot) เปรียบเทียบกับหุ่นยนต์กรงเหล็ก พร้อมระบบจำกัดแรงและเซนเซอร์ความปลอดภัย
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setMode('caged'); setSpeedLimit(1500); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'caged'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                : isDark 
                  ? 'bg-slate-800 text-slate-400 hover:text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            Industrial Caged Robot
          </button>
          <button
            onClick={() => { setMode('cobot'); setSpeedLimit(250); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === 'cobot'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20'
                : isDark 
                  ? 'bg-slate-800 text-slate-400 hover:text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            Collaborative Robot (Cobot)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column */}
        <div className={`space-y-4 p-4 rounded-xl border ${
          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
            isDark ? 'text-slate-300' : 'text-slate-800'
          }`}>
            <FiSliders className="w-4 h-4 text-teal-500" /> ตั้งค่าพารามิเตอร์จำลอง
          </h4>

          {mode === 'cobot' ? (
            <>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>โหมดจูงสอน (Hand Guiding):</span>
                  <span className={handGuiding ? 'text-cyan-600 font-bold' : isDark ? 'text-slate-500' : 'text-slate-400'}>
                    {handGuiding ? 'เปิดใช้งาน (Free Drive)' : 'ปิด (Program Running)'}
                  </span>
                </div>
                <button
                  onClick={() => setHandGuiding(!handGuiding)}
                  className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                    handGuiding
                      ? isDark 
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' 
                        : 'bg-cyan-50 border-cyan-400 text-cyan-950 font-bold'
                      : isDark 
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FiCrosshair className="w-4 h-4" />
                  {handGuiding ? 'ปล่อยปุ่มสอน (Release Guiding Button)' : 'กดปุ่มสอนค้าง (Press & Hold Free-Drive)'}
                </button>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>ขีดจำกัดความเร็วร่วม (Speed Limit):</span>
                  <span className="text-teal-500 font-mono font-bold">{speedLimit} mm/s</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="25"
                  value={speedLimit}
                  onChange={(e) => setSpeedLimit(Number(e.target.value))}
                  className="w-full accent-teal-500 cursor-pointer"
                />
                <span className={`text-[10px] block mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>มาตรฐาน ISO/TS 15066 แนะนำ Collaborative Speed ≤ 250 mm/s</span>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>แรงกด/ปะทะตรวจจับได้ (Joint Force):</span>
                  <span className="text-amber-500 font-mono font-bold">{impactForce} N</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="5"
                  value={impactForce}
                  onChange={(e) => setImpactForce(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <span className={`text-[10px] block mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>เกณฑ์ความปลอดภัยขอบเขตแรงกระทบร่างกาย: Max 140-150 N</span>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>ระยะห่างคนงานกับแขนกล:</span>
                  <span className="text-blue-500 font-mono font-bold">{distanceToHuman.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={distanceToHuman}
                  onChange={(e) => setDistanceToHuman(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>
            </>
          ) : (
            <div className={`p-4 rounded-lg border text-xs space-y-2 ${
              isDark ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}>
              <div className="font-bold flex items-center gap-1.5 text-rose-600">
                <FiAlertTriangle className="w-4 h-4" /> ข้อจำกัดหุ่นยนต์อุตสาหกรรมดั้งเดิม
              </div>
              <p>หุ่นยนต์ดั้งเดิมไม่มี Joint Torque Sensor และไม่มีฟังก์ชัน Power and Force Limiting (PFL)</p>
              <p>จำเป็นต้องติดตั้ง <strong>รั้วกั้นรอบทิศ (Safety Fence)</strong>, Safety Interlock Switch, และ Light Curtain 100% มิฉะนั้นผิดมาตรฐานความปลอดภัยแรงงาน</p>
            </div>
          )}
        </div>

        {/* Status & Visualizer Display */}
        <div className="lg:col-span-2 space-y-4">
          <div className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${statusColor}`}>
            <FiShield className="w-6 h-6 shrink-0" />
            <div>
              <div className="text-xs uppercase tracking-widest font-black opacity-80">Safety State Assessment</div>
              <div className="text-sm font-bold">{statusText}</div>
            </div>
          </div>

          <div className={`p-5 rounded-xl border space-y-4 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'
          }`}>
            <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
              isDark ? 'text-slate-300' : 'text-slate-800'
            }`}>
              <FiEye className="w-4 h-4 text-teal-500" />
              การแสดงผลสถานะระบบความปลอดภัยตามข้อกำหนด ISO/TS 15066
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <div className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Safety Function</div>
                <div className="text-xs font-bold text-teal-600 mt-1">PFL (Power & Force)</div>
                <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Torque Limits</div>
              </div>
              <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <div className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Speed Status</div>
                <div className={`text-xs font-bold mt-1 ${speedLimit <= 250 ? 'text-emerald-500' : 'text-amber-600'}`}>
                  {speedLimit} mm/s
                </div>
                <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                  {speedLimit <= 250 ? 'Compliant' : 'High Speed Risk'}
                </div>
              </div>
              <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <div className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Force Rating</div>
                <div className={`text-xs font-bold mt-1 ${impactForce <= 140 ? 'text-emerald-500' : 'text-rose-600'}`}>
                  {impactForce} N / 140 N
                </div>
                <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                  {impactForce <= 140 ? 'Safe Contact' : 'Hazard Stop'}
                </div>
              </div>
              <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <div className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Teach Method</div>
                <div className="text-xs font-bold text-cyan-600 mt-1">
                  {mode === 'cobot' ? 'Lead-Through' : 'Teach Pendant'}
                </div>
                <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                  {mode === 'cobot' ? 'Zero-Gravity' : 'Jog Buttons'}
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-lg border text-xs space-y-2 ${
              isDark ? 'bg-slate-900/60 border-slate-800/80 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-xs'
            }`}>
              <div className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-teal-300' : 'text-teal-800'}`}>
                <FiInfo className="w-4 h-4" /> สรุปข้อได้เปรียบของการประยุกต์ใช้ Cobot ในสายการผลิตยุคใหม่
              </div>
              <ul className={`list-disc list-inside space-y-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <li>ลดพื้นที่ติดตั้งโรงงาน (Footprint) ได้กว่า 40-60% จากการไม่ต้องมีกรงตาข่ายเหล็กล้อมรอบ</li>
                <li>สอนงานจุดใหม่ได้รวดเร็วภายใน 5-10 นาที ด้วยโหมดจูงแขน (Zero-Gravity Hand Guiding) แทนการกดปุ่มทีละแกน</li>
                <li>ปลอดภัยต่อผู้ปฏิบัติงานด้วยเซนเซอร์วัดแรงบิดทุกข้อต่อ (Dual Joint Torque Sensors) ป้องกันการหนีบหรือกระแทก</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* SIMULATOR 10: DIGITAL TWIN & OFFLINE PROGRAMMING (OLP) LAB (Module 10)    */
/* ========================================================================= */
export function RobotOfflineSimulationLab() {
  const { isDark } = useTheme();
  const [motionType, setMotionType] = useState('PTP'); // 'PTP' | 'LIN_BLENDED'
  const [singularityWarning, setSingularityWarning] = useState(false);
  const [tcpOffset, setTcpOffset] = useState(120); // mm
  const [collisionDetected, setCollisionDetected] = useState(false);

  const cycleTime = motionType === 'PTP' ? 8.4 : 6.1; // seconds

  return (
    <div className={`border rounded-2xl p-4 sm:p-6 space-y-6 transition-all ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
    }`}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <FiLayers className="w-5 h-5 text-indigo-500" />
            ห้องแล็บจำลอง Digital Twin & OLP (RoboDK / Process Simulate)
          </h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            จำลองวิถีการเคลื่อนที่ ตรวจจับจุดวิกฤตทางกลศาสตร์ (Singularity) และปรับปรุง Cycle Time ก่อนโหลดโค้ดลงแขนกลจริง
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setMotionType('PTP'); setSingularityWarning(false); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              motionType === 'PTP'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : isDark 
                  ? 'bg-slate-800 text-slate-400 hover:text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            Point-to-Point (PTP Stop)
          </button>
          <button
            onClick={() => { setMotionType('LIN_BLENDED'); setSingularityWarning(false); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              motionType === 'LIN_BLENDED'
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20'
                : isDark 
                  ? 'bg-slate-800 text-slate-400 hover:text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            Continuous Path (Zone Blending)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`space-y-4 p-4 rounded-xl border ${
          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
            isDark ? 'text-slate-300' : 'text-slate-800'
          }`}>
            <FiSliders className="w-4 h-4 text-indigo-500" /> ตัวแปรการจำลอง OLP
          </h4>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Tool Center Point (TCP Z-Offset):</span>
              <span className="text-indigo-500 font-mono font-bold">{tcpOffset} mm</span>
            </div>
            <input
              type="range"
              min="50"
              max="250"
              step="5"
              value={tcpOffset}
              onChange={(e) => setTcpOffset(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={() => setSingularityWarning(!singularityWarning)}
              className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                singularityWarning
                  ? isDark ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-rose-50 border-rose-400 text-rose-950 font-bold'
                  : isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FiAlertTriangle className="w-4 h-4" />
              {singularityWarning ? 'ปลดสถานะ Singularity' : 'จำลองขยับผ่าน Wrist Singularity'}
            </button>
          </div>

          <div>
            <button
              onClick={() => setCollisionDetected(!collisionDetected)}
              className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                collisionDetected
                  ? isDark ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-amber-50 border-amber-400 text-amber-950 font-bold'
                  : isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FiBox className="w-4 h-4" />
              {collisionDetected ? 'นำชิ้นงานที่ขวางออก' : 'จำลองแคลมป์ขวางทาง (Clash Check)'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`p-4 rounded-xl border text-center ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'}`}>
              <div className={`text-[10px] uppercase tracking-wider font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Simulated Cycle Time</div>
              <div className="text-2xl font-black text-teal-500 font-mono mt-1">{cycleTime} s</div>
              <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                {motionType === 'LIN_BLENDED' ? 'เร็วกว่า 27.3% (Smooth Trajectory)' : 'มาตรฐาน PTP หยุดทุกมุม'}
              </div>
            </div>

            <div className={`p-4 rounded-xl border text-center transition-all ${
              singularityWarning
                ? isDark ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-rose-50 border-rose-300 text-rose-950 font-bold'
                : isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700 shadow-xs'
            }`}>
              <div className="text-[10px] uppercase tracking-wider font-bold">Singularity Status</div>
              <div className={`text-base font-bold mt-1 ${singularityWarning ? 'text-rose-500' : 'text-emerald-500'}`}>
                {singularityWarning ? 'Wrist Singularity Error!' : 'Kinematics OK'}
              </div>
              <div className="text-[10px] mt-0.5 opacity-75">
                {singularityWarning ? 'Joint 5 = 0° (Infinite Vel)' : 'No Singularity in Path'}
              </div>
            </div>

            <div className={`p-4 rounded-xl border text-center transition-all ${
              collisionDetected
                ? isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-950 font-bold'
                : isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700 shadow-xs'
            }`}>
              <div className="text-[10px] uppercase tracking-wider font-bold">Mesh Clash Detection</div>
              <div className={`text-base font-bold mt-1 ${collisionDetected ? 'text-amber-600' : 'text-emerald-500'}`}>
                {collisionDetected ? 'Clash With Fixture!' : 'Clearance > 25 mm'}
              </div>
              <div className="text-[10px] mt-0.5 opacity-75">
                {collisionDetected ? 'ชนจิ๊กจับยึดที่จุด P3' : 'Safe Tool Envelope'}
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl border space-y-3 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'
          }`}>
            <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
              isDark ? 'text-slate-300' : 'text-slate-800'
            }`}>
              <FiActivity className="w-4 h-4 text-indigo-500" /> การเปรียบเทียบ Zero-Downtime Deployment
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className={`p-3 rounded-lg border ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-xs'
              }`}>
                <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>วิธีเดิม (Manual Online Teaching):</span>
                <p className={`mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  ต้องหยุดไลน์ผลิต (Line Stop) 8-16 ชั่วโมงเพื่อกดสอนทีละจุด เสี่ยงแขนกลชนจิ๊กและคำนวณ Cycle Time พลาด
                </p>
              </div>
              <div className={`p-3 rounded-lg border ${
                isDark ? 'bg-teal-500/10 border-teal-500/30 text-teal-300' : 'bg-teal-50 border-teal-200 text-teal-950'
              }`}>
                <span className="font-bold text-teal-600">วิธี OLP &amp; Digital Twin (ยุคใหม่):</span>
                <p className="mt-1 leading-relaxed">
                  เขียนโปรแกรมบนคอมพิวเตอร์ 100% ตรวจสอบชนและ Singularity ล่วงหน้า โหลดเข้าหุ่นยนต์จริงใช้เวลา Setup หน้างานเพียง 15 นาที
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* SIMULATOR 11: INDUSTRIAL FIELDBUS & MES PROTOCOL LAB (Module 11)          */
/* ========================================================================= */
export function RobotIndustrialFieldbusLab() {
  const { isDark } = useTheme();
  const [protocol, setProtocol] = useState('PROFINET'); // 'PROFINET' | 'ETHERCAT' | 'OPC_UA'
  const [handshakeStep, setHandshakeStep] = useState(0);

  const steps = [
    { title: '1. MES Job Ready', desc: 'MES ส่ง Work Order ID & ชนิดชิ้นงานผ่าน Bit 0.0' },
    { title: '2. Robot Ack & Start', desc: 'หุ่นยนต์ตอบรับสัญญาณ Robot_Busy และเริ่มเดินโปรแกรม Pick' },
    { title: '3. Process Executing', desc: 'หุ่นยนต์เคลื่อนที่ตาม Trajectory และตรวจจับสถานะ Gripper' },
    { title: '4. Cycle Complete & Data Sent', desc: 'ส่ง Cycle Time (s), แรงกดสูงสุด (N), และ Part OK กลับ MES' }
  ];

  return (
    <div className={`border rounded-2xl p-4 sm:p-6 space-y-6 transition-all ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
    }`}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <FiServer className="w-5 h-5 text-emerald-500" />
            ห้องแล็บ Industrial Fieldbus (Profinet/EtherCAT) &amp; MES Handshake
          </h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            ทำความเข้าใจการเชื่อมต่อแขนกลเข้ากับ PLC และ MES ด้วยโปรโตคอลความเร็วสูงระดับมิลลิวินาทีแทนการเดินสายรีเลย์ 24V แบบเก่า
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {['PROFINET', 'ETHERCAT', 'OPC_UA'].map((p) => (
            <button
              key={p}
              onClick={() => setProtocol(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                protocol === p
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                  : isDark 
                    ? 'bg-slate-800 text-slate-400 hover:text-white' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`space-y-4 p-4 rounded-xl border ${
          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
            isDark ? 'text-slate-300' : 'text-slate-800'
          }`}>
            <FiWifi className="w-4 h-4 text-emerald-500" /> คุณสมบัติของ {protocol}
          </h4>

          {protocol === 'PROFINET' && (
            <div className={`text-xs space-y-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <div className={`flex justify-between py-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Class:</span>
                <span className="font-mono text-emerald-600 font-bold">PROFINET IRT (Isochronous Real-Time)</span>
              </div>
              <div className={`flex justify-between py-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Cycle Time:</span>
                <span className="font-mono text-emerald-600 font-bold">&lt; 1.0 ms (Jitter &lt; 1 µs)</span>
              </div>
              <div className={`flex justify-between py-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Safety Extension:</span>
                <span className="font-mono text-emerald-600 font-bold">PROFIsafe over Ethernet</span>
              </div>
              <p className={`text-[11px] pt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                มาตรฐานยอดนิยมสูงสุดสำหรับแขนกลในอุตสาหกรรมยานยนต์ ใช้สายแลนเส้นเดียวส่งทั้ง Safety, Data, และ Motion
              </p>
            </div>
          )}

          {protocol === 'ETHERCAT' && (
            <div className={`text-xs space-y-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <div className={`flex justify-between py-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Technology:</span>
                <span className="font-mono text-cyan-600 font-bold">Processing On the Fly</span>
              </div>
              <div className={`flex justify-between py-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Cycle Time:</span>
                <span className="font-mono text-cyan-600 font-bold">250 µs - 1.0 ms</span>
              </div>
              <div className={`flex justify-between py-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Safety Extension:</span>
                <span className="font-mono text-cyan-600 font-bold">FailSafe over EtherCAT (FSoE)</span>
              </div>
              <p className={`text-[11px] pt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                ความเร็วตอบสนองสูงพิเศษ เหมาะอย่างยิ่งสำหรับหุ่นยนต์ Delta และงาน Synchronization แขนกลหลายตัวพร้อมกัน
              </p>
            </div>
          )}

          {protocol === 'OPC_UA' && (
            <div className={`text-xs space-y-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <div className={`flex justify-between py-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Architecture:</span>
                <span className="font-mono text-amber-600 font-bold">OPC UA Companion Spec for Robotics</span>
              </div>
              <div className={`flex justify-between py-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Role:</span>
                <span className="font-mono text-amber-600 font-bold">IT/OT Gateway to MES / Cloud</span>
              </div>
              <div className={`flex justify-between py-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Security:</span>
                <span className="font-mono text-amber-600 font-bold">X.509 Certificate &amp; Encryption</span>
              </div>
              <p className={`text-[11px] pt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                มาตรฐานกลางเปิดข้ามแบรนด์ (Vendor-Agnostic) ดึงข้อมูลสถานะแขนกล KUKA, ABB, Fanuc, Yaskawa เข้า MES โดยไม่ต้องแปลงโปรโตคอล
              </p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className={`p-4 rounded-xl border space-y-3 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                isDark ? 'text-slate-300' : 'text-slate-800'
              }`}>
                <FiRepeat className="w-4 h-4 text-emerald-500" />
                ลำดับสัญญาณดิจิทัล Handshake (PLC ↔ Robot ↔ MES)
              </h4>
              <button
                onClick={() => setHandshakeStep((prev) => (prev + 1) % steps.length)}
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isDark 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30' 
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                }`}
              >
                <FiPlay className="w-3.5 h-3.5" /> ลำดับถัดไป (Step Forward)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
              {steps.map((st, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border text-xs transition-all ${
                    handshakeStep === idx
                      ? isDark 
                        ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg shadow-emerald-500/10' 
                        : 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-xs'
                      : isDark 
                        ? 'bg-slate-900 border-slate-800 text-slate-400' 
                        : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="font-bold">{st.title}</div>
                  <div className="text-[10px] mt-1 opacity-80">{st.desc}</div>
                </div>
              ))}
            </div>

            <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
              isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-xs'
            }`}>
              <div>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>สถานะ Handshake: </span>
                <span className="font-mono text-emerald-600 font-bold">{steps[handshakeStep].title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[11px] text-emerald-600 font-mono font-bold">LINK OK</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* SIMULATOR 12: 3D VISION & AI BIN PICKING LAB (Module 12)                  */
/* ========================================================================= */
export function RobotAiVisionBinPickingSimulator() {
  const { isDark } = useTheme();
  const [cameraType, setCameraType] = useState('STRUCTURED_LIGHT'); // 'STRUCTURED_LIGHT' | 'TIME_OF_FLIGHT'
  const [surfaceReflectivity, setSurfaceReflectivity] = useState('METALLIC'); // 'METALLIC' | 'MATTE'
  const [detectionConfidence, setDetectionConfidence] = useState(94.2);

  const fps = cameraType === 'STRUCTURED_LIGHT' ? '5 - 15 FPS (ความละเอียดสูง 0.05 mm)' : '30 - 60 FPS (ความละเอียด 1.5 mm)';

  return (
    <div className={`border rounded-2xl p-4 sm:p-6 space-y-6 transition-all ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
    }`}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <FiEye className="w-5 h-5 text-cyan-500" />
            ห้องแล็บจำลอง 3D Vision Guidance &amp; AI Bin Picking
          </h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            จำลองการหยิบชิ้นงานที่วางซ้อนทับกันแบบไม่เป็นระเบียบ (Random Bin Picking) ด้วยกล้อง 3D Point Cloud และ AI Pose Estimation 6-DoF
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setCameraType('STRUCTURED_LIGHT'); setDetectionConfidence(94.2); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              cameraType === 'STRUCTURED_LIGHT'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
                : isDark 
                  ? 'bg-slate-800 text-slate-400 hover:text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            Structured Light 3D
          </button>
          <button
            onClick={() => { setCameraType('TIME_OF_FLIGHT'); setDetectionConfidence(86.5); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              cameraType === 'TIME_OF_FLIGHT'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : isDark 
                  ? 'bg-slate-800 text-slate-400 hover:text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            Time-of-Flight (ToF) 3D
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`space-y-4 p-4 rounded-xl border ${
          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
            isDark ? 'text-slate-300' : 'text-slate-800'
          }`}>
            <FiSliders className="w-4 h-4 text-cyan-500" /> พารามิเตอร์ระบบ 3D Vision
          </h4>

          <div>
            <div className={`text-xs mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>ชนิดผิวชิ้นงานในกระบะ:</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSurfaceReflectivity('METALLIC')}
                className={`p-2 rounded-lg text-xs font-bold border transition-all ${
                  surfaceReflectivity === 'METALLIC'
                    ? isDark ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-amber-50 border-amber-400 text-amber-950 font-bold'
                    : isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                โลหะสะท้อนแสงสูง
              </button>
              <button
                onClick={() => setSurfaceReflectivity('MATTE')}
                className={`p-2 rounded-lg text-xs font-bold border transition-all ${
                  surfaceReflectivity === 'MATTE'
                    ? isDark ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                    : isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                ผิวด้านไม่สะท้อน
              </button>
            </div>
          </div>

          <div className={`p-3 rounded-lg border text-xs space-y-1 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className={isDark ? 'text-slate-400' : 'text-slate-600'}>ข้อจำกัดของกล้อง:</div>
            <div className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{fps}</div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`p-4 rounded-xl border text-center ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'}`}>
              <div className={`text-[10px] uppercase tracking-wider font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>AI Pose Estimation</div>
              <div className="text-2xl font-black text-cyan-500 font-mono mt-1">6-DoF</div>
              <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>X, Y, Z, Roll, Pitch, Yaw</div>
            </div>

            <div className={`p-4 rounded-xl border text-center ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'}`}>
              <div className={`text-[10px] uppercase tracking-wider font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Grasp Confidence</div>
              <div className="text-2xl font-black text-emerald-500 font-mono mt-1">
                {surfaceReflectivity === 'METALLIC' ? (detectionConfidence - 6.5).toFixed(1) : detectionConfidence.toFixed(1)}%
              </div>
              <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                {surfaceReflectivity === 'METALLIC' ? 'ลดลงเล็กน้อยจากแสงสะท้อน (Anti-Glare On)' : 'ความมั่นใจในการเข้าจับสูง'}
              </div>
            </div>

            <div className={`p-4 rounded-xl border text-center ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'}`}>
              <div className={`text-[10px] uppercase tracking-wider font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Collision Free Path</div>
              <div className="text-base font-bold text-teal-600 mt-1">100% Calculated</div>
              <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>ตรวจขอบกระบะ Bin ขวาง Gripper</div>
            </div>
          </div>

          <div className={`p-4 rounded-xl border space-y-2 text-xs ${
            isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h4 className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-cyan-300' : 'text-cyan-800'}`}>
              <FiCheckCircle className="w-4 h-4" /> ขั้นตอนการทำงานจริงของระบบ AI Bin Picking ในโรงงาน
            </h4>
            <ol className={`list-decimal list-inside space-y-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              <li><strong>3D Point Cloud Acquisition:</strong> กล้องด้านบนกระบะยิงแสง Structured Light ฉายลายเส้น เพื่อกวาดจุดพิกัด 3 มิตินับล้านจุด</li>
              <li><strong>AI Part Segmentation &amp; CAD Matching:</strong> โมเดล AI แยกแยะชิ้นงานแต่ละชิ้นที่กองทับกัน และเทียบกับ 3D CAD model เพื่อหาตำแหน่งมุมเอียง 6 แกน</li>
              <li><strong>Grasp Planning &amp; Collision Avoidance:</strong> เลือกชิ้นที่อยู่บนสุดซึ่งไม่มีชิ้นอื่นทับ และวางแผนเส้นทางแขนกลไม่ให้หัว Gripper ชนขอบกระบะเหล็ก</li>
              <li><strong>Active Compliance Insertion:</strong> นำชิ้นงานไปป้อนเครื่องจักรด้วยเซนเซอร์วัดแรง เพื่อไม่ให้ชิ้นงานขัดตัว</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* MODULE 9 LESSON COMPONENT: COBOTS & DIRECT TEACHING                       */
/* ========================================================================= */
/* ========================================================================= */
/* MODULE 9 LESSON: COBOTS, DIRECT TEACHING & FORCE-LIMITING SAFETY          */
/* ========================================================================= */
export function RobotMod9() {
  const { isDark } = useTheme();
  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn">
      {/* Module Header Banner */}
      <div className={`p-6 md:p-8 rounded-2xl border shadow-xl relative overflow-hidden transition-all ${
        isDark 
          ? 'bg-gradient-to-r from-teal-950/80 via-slate-900 to-cyan-950/70 border-teal-500/30' 
          : 'bg-gradient-to-r from-teal-50 via-white to-cyan-50 border-teal-300 shadow-teal-500/5'
      }`}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-300 text-xs font-bold mb-3 border border-teal-500/30">
          <FiShield className="w-4 h-4" /> โมดูลที่ 9 (Module 9 of 12 - Advanced Robotics Masterclass)
        </div>
        <h1 className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          หุ่นยนต์ร่วมปฏิบัติการ (Cobots), Direct Teaching &amp; มาตรฐานแรงปะทะ ISO/TS 15066
        </h1>
        <p className={`text-sm md:text-base leading-relaxed max-w-4xl ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          ศึกษาวิวัฒนาการการปฏิวัติจากการกักขังหุ่นยนต์ในกรงตาข่ายเหล็ก สู่การทำงานเคียงบ่าเคียงไหล่กับมนุษย์แบบไร้รั้วกั้น (Fenceless Operation), 
          4 รูปแบบการทำงานร่วมกันตามมาตรฐาน ISO 10218 และ ISO/TS 15066, การคำนวณขีดจำกัดแรงกดทางชีวกลศาสตร์ (Biomechanical Thresholds 140 N), 
          และกลไกชดเชยแรงโน้มถ่วงแบบแอกทีฟสำหรับการจูงสอนด้วยมือเปล่า (Zero-Gravity Direct Teaching)
        </p>
      </div>

      {/* Section 1: Evolution to Collaborative Robotics */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-teal-600/30 text-teal-600 dark:text-teal-400 flex items-center justify-center text-sm font-black border border-teal-500/40">1</span>
          วิวัฒนาการจาก Traditional Industrial Robot สู่ Collaborative Robot (Cobot)
        </h2>
        <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          ในอดีต หุ่นยนต์อุตสาหกรรมถูกเปรียบเหมือน "ยักษ์ตาบอด" ที่มีแรงเหวี่ยงมหาศาล หากมนุษย์หลุดเข้าไปในพื้นที่รัศมีทำงานอาจเกิดอุบัติเหตุถึงแก่ชีวิตได้ 
          กฎหมายความปลอดภัยจึงบังคับให้ติดตั้งกรงเหล็กล้อมรอบ 100% แต่หุ่นยนต์ร่วมปฏิบัติการ (Cobot) ถูกออกแบบใหม่ตั้งแต่ฐานรากเพื่อความปลอดภัย:
        </p>

        <div className="overflow-x-auto pb-2 scrollbar-thin rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[680px] text-left text-xs border-collapse">
            <thead className={`font-semibold uppercase text-[11px] border-b ${
              isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              <tr>
                <th className="py-3 px-4 w-[24%]">มิติการประเมิน (Feature)</th>
                <th className="py-3 px-4 w-[38%] text-rose-600 dark:text-rose-300">หุ่นยนต์กรงเหล็กดั้งเดิม (Caged Robot)</th>
                <th className="py-3 px-4 w-[38%] text-teal-600 dark:text-teal-400 font-bold">หุ่นยนต์ร่วมปฏิบัติการ (Cobot)</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-800'}`}>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">การป้องกันพื้นที่ (Safety Guarding)</td>
                <td className="py-3 px-4 text-rose-500">ต้องมีรั้วตาข่ายเหล็กล้อมรอบ 100% + Safety Interlock</td>
                <td className="py-3 px-4 font-bold text-teal-600 dark:text-teal-400">ทำงานไร้รั้วกั้นได้ (Fenceless) ร่วมโต๊ะงานเดียวกับมนุษย์</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">เซนเซอร์ตรวจจับแรงที่ข้อต่อ (Torque Sensing)</td>
                <td className="py-3 px-4 text-rose-500">ไม่มี ตรวจจับการชนไม่ได้จนกว่ามอเตอร์จะ Overload ตัด</td>
                <td className="py-3 px-4 font-bold text-teal-600 dark:text-teal-400">มี Joint Torque Sensor ทุกข้อต่อ หยุดในเวลา &lt; 50 ms</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">วิธีการสอนจุดพิกัด (Teaching Method)</td>
                <td className="py-3 px-4">กดปุ่มจ็อกแกนบน Teach Pendant ทีละแกน (ใช้เวลา 2-4 ชม.)</td>
                <td className="py-3 px-4 font-bold text-teal-600 dark:text-teal-400">จูงแขนกลด้วยมือเปล่า (Direct Hand Guiding ใน 5 นาที)</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">การประหยัดพื้นที่โรงงาน (Factory Footprint)</td>
                <td className="py-3 px-4 text-rose-500">ใช้พื้นที่กว้างมาก เสียพื้นที่ให้กับรั้วและระยะเผื่อความปลอดภัย</td>
                <td className="py-3 px-4 font-bold text-teal-600 dark:text-teal-400">ประหยัดพื้นที่โรงงานลงได้ 40 - 60%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: 4 Collaborative Modes ISO 15066 */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-teal-600/30 text-teal-600 dark:text-teal-400 flex items-center justify-center text-sm font-black border border-teal-500/40">2</span>
          4 รูปแบบการทำงานร่วมกันตามข้อกำหนดมาตรฐาน ISO 10218 / ISO/TS 15066
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h3 className="font-bold text-teal-600 dark:text-teal-300 text-sm">1. Safety-Rated Monitored Stop (SMS)</h3>
            <p className="leading-relaxed">
              หุ่นยนต์สามารถทำงานด้วยความเร็วสูงสุดของมอเตอร์อุตสาหกรรม แต่เมื่อมนุษย์ก้าวเข้าสู่พื้นที่ปฏิบัติการ (ตรวจจับผ่าน Laser Scanner หรือม่านแสง) 
              ระบบขับเคลื่อนจะหยุดนิ่งทันทีโดยไม่ต้องตัดกระแสไฟเลี้ยง (Drive stays energized with zero speed) และเริ่มทำงานต่อโดยอัตโนมัติเมื่อมนุษย์เดินออก
            </p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h3 className="font-bold text-cyan-600 dark:text-cyan-300 text-sm">2. Hand Guiding (Direct Teaching)</h3>
            <p className="leading-relaxed">
              ผู้สอนงานสามารถจับแขนกลขยับได้อย่างอิสระ โดยมีปุ่ม Enabling Switch หรือปุ่ม Free-Drive บนมือจับ แขนกลจะเปิดระบบ Active Gravity Compensation 
              ชดเชยน้ำหนักตัวเองให้ลอยตัวเสมือนอยู่ในสภาวะสุญญากาศไร้น้ำหนัก ทำให้ผู้สอนลากแขนกลไปแตะจุดที่ต้องการและกดบันทึกพิกัดได้ทันที
            </p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h3 className="font-bold text-amber-600 dark:text-amber-300 text-sm">3. Speed &amp; Separation Monitoring (SSM)</h3>
            <p className="leading-relaxed">
              การคำนวณระยะปลอดภัยตามมาตรฐาน ISO 13855: $S = (v_h \times T_r) + (v_r \times T_s) + C$ 
              โดยเซนเซอร์ 2D/3D Laser Scanner วัดระยะห่างระหว่างคนกับแขนกล หากคนอยู่ไกล แขนกลวิ่งเต็มสปีด 1,500 mm/s เมื่อคนเดินเข้าใกล้ จะลดความเร็วเหลือ 250 mm/s และหยุดสนิทหากเข้าใกล้เกินระยะวิกฤต
            </p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h3 className="font-bold text-rose-600 dark:text-rose-300 text-sm">4. Power and Force Limiting (PFL)</h3>
            <p className="leading-relaxed">
              หัวใจสำคัญที่สุดของ Cobot ข้อต่อทุกแกนมีเซนเซอร์วัดแรงบิดอย่างต่อเนื่อง หากเกิดการกระทบกับร่างกายมนุษย์เกินเกณฑ์ชีวกลศาสตร์ 
              <strong>Max 140 N</strong> (สำหรับบริเวณหน้าอกและซี่โครง) หรือเกิดแรงดันเกิน <strong>150 N/cm²</strong> ระบบจะตัดการเคลื่อนที่ในเสี้ยววินาทีและคลายแรงออกทันที
            </p>
          </div>
        </div>
      </section>

      {/* Simulator 9 Embed */}
      <RobotCobotDirectTeachingSimulator />

      {/* Section 3: Joint Torque Sensing & Zero-G Mathematics */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-teal-600/30 text-teal-600 dark:text-teal-400 flex items-center justify-center text-sm font-black border border-teal-500/40">3</span>
          คณิตศาสตร์ระบบชดเชยแรงโน้มถ่วง (Zero-Gravity Active Compensation)
        </h2>
        <div className={`p-4 rounded-xl border font-mono text-xs space-y-2 ${
          isDark ? 'bg-slate-950 border-slate-800 text-teal-300' : 'bg-slate-50 border-slate-200 text-teal-800'
        }`}>
          <div className="font-bold text-sm text-slate-800 dark:text-white">สมการควบคุมแรงบิดชดเชย (Joint Torque Feedforward Equation):</div>
          <div>&tau;_motor(i) = G_i(q_1, ..., q_6) + M_tool &times; g &times; r_cg(q) &plusmn; &tau;_friction</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
            โดย G_i คือเมทริกซ์แรงโน้มถ่วงของชิ้นส่วนแขนกล, M_tool คือน้ำหนักของเครื่องมือปลายแขน (Gripper + Part), ระบบประมวลผลคำนวณซ้ำทุก 1 ms ทำให้ผู้สอนใช้นิ้วมือสะกิดแขนกลขยับได้อย่างนุ่มนวล
          </div>
        </div>
      </section>

      {/* Section 4: Factory Case Study */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-teal-600/30 text-teal-600 dark:text-teal-400 flex items-center justify-center text-sm font-black border border-teal-500/40">4</span>
          กรณีศึกษาหน้างาน: การติดตั้ง Cobot ช่วยขันสกรูในสถานีประกอบเครื่องปรับอากาศ
        </h2>
        <div className="space-y-3 text-xs">
          <div className={`p-4 rounded-xl border space-y-1.5 ${
            isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span className="text-amber-500 flex items-center gap-1.5"><FiAlertTriangle /> ปัญหาเดิม: พนักงานเมื่อยล้าจากการก้มขันสกรู 1,600 ตัวต่อกะ เกิดปัญหาแรงบิดไม่ถึงสเปก</span>
            </div>
            <p><strong>การแก้ปัญหาด้วย Cobot:</strong> ติดตั้ง Cobot 6 แกนข้างโต๊ะงานของพนักงานโดยไม่ต้องกั้นรั้ว พนักงานวางคอมเพรสเซอร์ Cobot ยื่นหัวขันสกรูอัตโนมัติด้วยแรงบิดควบคุม 8.5 Nm และมีเซนเซอร์ Safety Laser Scanner ควบคุมความเร็วตามระยะห่างพนักงาน เพิ่มผลผลิต 35% ไร้อุบัติเหตุ 100%</p>
          </div>
        </div>
      </section>

      {/* Section 5: Risk Assessment SOP Checklist */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-teal-600/30 text-teal-600 dark:text-teal-400 flex items-center justify-center text-sm font-black border border-teal-500/40">5</span>
          ใบตรวจสอบความปลอดภัยก่อนส่งมอบ Cobot (ISO 12100 &amp; ISO/TS 15066 SOP Checklist)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {[
            { title: '1. Pinch Points & Gap Check', desc: 'ตรวจสอบระยะหนีบระหว่างข้อต่อ ไม่ให้มีช่องว่างแคบที่อาจหนีบนิ้วมือ (ระยะปลอดภัยต้อง &ge; 25 mm หรือ &le; 4 mm)' },
            { title: '2. End-Effector Radius Radius', desc: 'หัวจับ Gripper และชิ้นงานต้องไม่มีขอบคม หากเป็นชิ้นงานมีคมต้องติดตั้งกรอบกำบังหรือใช้เซนเซอร์หยุดก่อนแตะ' },
            { title: '3. Bio-fidelic Force Measurement', desc: 'ใช้เครื่องวัดแรงกระแทกมาตรฐาน (Pilz PRMS) ทดสอบชนจุดต่างๆ แรงกดต้องไม่เกิน 140 N ตามเกณฑ์ ISO 15066' },
            { title: '4. Operator Safety Acceptance', desc: 'ฝึกอบรมพนักงานประจำสถานีให้เข้าใจพฤติกรรมการเคลื่อนที่ของ Cobot และการกดปุ่มหยุดฉุกเฉิน E-Stop' }
          ].map((item, idx) => (
            <div key={idx} className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <FiCheckCircle className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
              <div>
                <div className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{item.title}</div>
                <div className={`text-[11px] mt-0.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ========================================================================= */
/* MODULE 10 LESSON: DIGITAL TWIN & OFFLINE PROGRAMMING (OLP)               */
/* ========================================================================= */
export function RobotMod10() {
  const { isDark } = useTheme();
  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn">
      {/* Module Header Banner */}
      <div className={`p-6 md:p-8 rounded-2xl border shadow-xl relative overflow-hidden transition-all ${
        isDark 
          ? 'bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/70 border-indigo-500/30' 
          : 'bg-gradient-to-r from-indigo-50 via-white to-purple-50 border-indigo-300 shadow-indigo-500/5'
      }`}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs font-bold mb-3 border border-indigo-500/30">
          <FiLayers className="w-4 h-4" /> โมดูลที่ 10 (Module 10 of 12 - Advanced Robotics Masterclass)
        </div>
        <h1 className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Digital Twin &amp; โปรแกรมหุ่นยนต์ออฟไลน์ (Offline Programming - OLP)
        </h1>
        <p className={`text-sm md:text-base leading-relaxed max-w-4xl ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          การจำลองสายการผลิตเสมือนจริงด้วยซอฟต์แวร์ OLP (RoboDK / Siemens Process Simulate), การวิเคราะห์เชิงคณิตศาสตร์เพื่อขจัด 3 จุดวิกฤต Singularity 
          (Wrist, Shoulder, Elbow), การตรวจสอบการชนของเครื่องมือกับจิ๊กจับยึด (Clash Detection), 
          และการปรับแต่งรัศมีโค้ง Zone Blending เพื่อตัดลดเวลา Cycle Time ลงได้มากกว่า 25%
        </p>
      </div>

      {/* Section 1: Economic Justification of OLP */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-black border border-indigo-500/40">1</span>
          ต้นทุนเศรษฐศาสตร์: ทำไมโรงงานยุคใหม่จึงห้ามใช้ Teach Pendant สอนสดหน้างาน?
        </h2>
        <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          การหยุดไลน์ผลิต (Line Stop) เพื่อให้โปรแกรมเมอร์เข้าไปยืนกดจ็อกแขนกลทีละจุด มีต้นทุนความสูญเสียทางอุตสาหกรรมสูงถึง 50,000 - 200,000 บาทต่อชั่วโมง 
          การเขียนโปรแกรมแบบ OLP บน Digital Twin ช่วยให้สามารถจำลองและตรวจสอบโค้ดล่วงหน้าได้ 100% ขณะที่ไลน์ผลิตจริงยังเดินเครื่องผลิตชิ้นงานเดิมอยู่:
        </p>

        <div className="overflow-x-auto pb-2 scrollbar-thin rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[680px] text-left text-xs border-collapse">
            <thead className={`font-semibold uppercase text-[11px] border-b ${
              isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              <tr>
                <th className="py-3 px-4 w-[24%]">มิติการประเมิน (Dimension)</th>
                <th className="py-3 px-4 w-[38%] text-rose-600 dark:text-rose-300">การสอนสดหน้างาน (Teach Pendant Online)</th>
                <th className="py-3 px-4 w-[38%] text-indigo-600 dark:text-indigo-400 font-bold">การจำลองออฟไลน์ (Digital Twin OLP)</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-800'}`}>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">เวลาหยุดเครื่องเพื่อ Setup (Downtime)</td>
                <td className="py-3 px-4 text-rose-500">8 - 24 ชั่วโมง (สูญเสียมูลค่าการผลิตมหาศาล)</td>
                <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">15 - 30 นาที (โหลดโค้ดและ Calibrate จุดอ้างอิง)</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">ความเสี่ยงแขนกลชนจิ๊กและอุปกรณ์ (Collision Risk)</td>
                <td className="py-3 px-4 text-rose-500">สูงมาก จากมุมอับสายตาของผู้สอนหน้างาน</td>
                <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">0% ผ่านการทดสอบ 3D Collision Mesh Check ล่วงหน้า</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">การคำนวณ Cycle Time ที่แม่นยำ</td>
                <td className="py-3 px-4">กะประมาณด้วยนาฬิกาจับเวลา ไม่รู้ความเร็วเร่งสูงสุด</td>
                <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">จำลองกราฟไดนามิกส์มอเตอร์ แม่นยำ &plusmn;0.1 วินาที</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Mathematical Singularities */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-black border border-indigo-500/40">2</span>
          คณิตศาสตร์ของ 3 จุดวิกฤตทางกลศาสตร์ (Kinematic Singularities)
        </h2>
        <div className={`p-4 rounded-xl border font-mono text-xs space-y-2 ${
          isDark ? 'bg-slate-950 border-slate-800 text-indigo-300' : 'bg-slate-50 border-slate-200 text-indigo-800'
        }`}>
          <div className="font-bold text-sm text-slate-800 dark:text-white">สมการจาโคเบียนจุดวิกฤต (Jacobian Singularity Condition):</div>
          <div>v_tcp = J(q) &times; q_dot &rArr; q_dot = J(q)^(-1) &times; v_tcp</div>
          <div>เมื่อ det(J(q)) = 0 &rArr; ความเร็วข้อต่อ q_dot &rarr; &infin; (Infinite Joint Velocity)</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
            คอนโทรลเลอร์ไม่สามารถคำนวณการเคลื่อนที่แนวเส้นตรง (MOVEL) ได้ ส่งผลให้มอเตอร์เกิดเสียงดังกระชากและตัดการทำงาน Error ทันที
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <h4 className="font-bold text-rose-600 dark:text-rose-400 text-sm">1. Wrist Singularity</h4>
            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
              เกิดขึ้นเมื่อแกน 5 พับตรงเป็นมุม 0° ทำให้แกน 4 และแกน 6 ขนานกันในแนวเส้นตรงเดียวกัน 
              แขนกลสูญเสียองศาอิสระในการบิดข้อมือ มอเตอร์แกน 4 จะพยายามหมุนด้วยความเร็วสูงผิดปกติ แก้ไขโดยเอียงหัว Tool อย่างน้อย 5°
            </p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <h4 className="font-bold text-amber-600 dark:text-amber-400 text-sm">2. Shoulder Singularity</h4>
            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
              เกิดขึ้นเมื่อจุดศูนย์กลางข้อมือ (Wrist Center) เคลื่อนที่ผ่านแนวแกนหมุนของแกนที่ 1 (Base Joint) 
              แขนกลต้องสะบัดฐาน 180° ในพริบตาเพื่อรักษาความเร็วปลาย Tool แก้ไขโดยปรับตำแหน่งฐานหุ่นยนต์หรือหลบเส้นทางไม่ให้ตัดแกนกลาง
            </p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <h4 className="font-bold text-teal-600 dark:text-teal-400 text-sm">3. Elbow Singularity</h4>
            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
              เกิดขึ้นเมื่อข้อศอก (แกน 3) เหยียดตรง 180° แขนกลเหยียดสุดรัศมีทำงาน (Maximum Reach Limit) 
              ไม่สามารถเคลื่อนที่แนวเส้นตรงเหยียดออกไปได้อีก แก้ไขโดยวางชิ้นงานให้อยู่ในระยะ 60-80% ของรัศมีแขนกล
            </p>
          </div>
        </div>
      </section>

      {/* Simulator 10 Embed */}
      <RobotOfflineSimulationLab />

      {/* Section 3: Zone Blending Optimization */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-black border border-indigo-500/40">3</span>
          การเพิ่มผลผลิตด้วย Zone Blending (Corner Smoothing Optimization)
        </h2>
        <p className={`text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300`}>
          หากใช้คำสั่งหยุดสนิท (Fine Stop: CNT 0 หรือ Fine) แขนกลจะต้องชะลอความเร็วลงเหลือ 0 mm/s ในทุกๆ จุดเลี้ยว แล้วจึงเร่งความเร็วใหม่ 
          ทำให้เกิดการกระตุกและกินเวลาไปป์ไลน์ ใน OLP วิศวกรจะกำหนด <strong>Corner Zone Radius (Zone 50 - 100 mm)</strong> 
          ให้แขนกลตัดโค้งอย่างนุ่มนวล รักษาความเร็วต่อเนื่อง ตัดลดเวลา Cycle Time ลงได้กว่า <strong>27.3%</strong> และยืดอายุการใช้งานกระปุกเกียร์
        </p>
      </section>

      {/* Section 4: Calibration SOP Checklist */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-black border border-indigo-500/40">4</span>
          ขั้นตอนการ Calibrate โลกเสมือนกับโลกจริง (3-Point User Frame SOP Checklist)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {[
            { title: '1. Tool Center Point (TCP) Calibration', desc: 'ใช้วิธี 4-Point Method หรือ Pointer Jig สอบเทียบจุดปลาย Tool ให้มีความคลาดเคลื่อนไม่เกิน &plusmn;0.2 mm' },
            { title: '2. User Frame 3-Point Touch', desc: 'แตะจุดกำเนิด (Origin), จุดแกน X+, และจุดแกน Y+ บนจิ๊กจริง เพื่อปรับระนาบโลกเสมือนใน OLP ให้ตรงกับแท่นหน้างาน 100%' },
            { title: '3. Low-Speed Dry Run Verification', desc: 'รันโค้ดรอบแรกด้วยความเร็ว Override 10% พร้อมกดปุ่ม Hold เพื่อตรวจดูระยะเผื่อ Safety Clearance หน้างานจริง' },
            { title: '4. Post-Processor Syntax Check', desc: 'ตรวจสอบรหัสคำสั่งเฉพาะยี่ห้อ (เช่น Fanuc .TP, KUKA .src/.dat, ABB .mod) ไม่มีคำสั่งพิกัดที่เกินขอบเขตแกน' }
          ].map((item, idx) => (
            <div key={idx} className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <FiCheckCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <div className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{item.title}</div>
                <div className={`text-[11px] mt-0.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ========================================================================= */
/* MODULE 11 LESSON: INDUSTRIAL FIELDBUS & MES INTEGRATION                   */
/* ========================================================================= */
export function RobotMod11() {
  const { isDark } = useTheme();
  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn">
      {/* Module Header Banner */}
      <div className={`p-6 md:p-8 rounded-2xl border shadow-xl relative overflow-hidden transition-all ${
        isDark 
          ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/70 border-emerald-500/30' 
          : 'bg-gradient-to-r from-emerald-50 via-white to-teal-50 border-emerald-300 shadow-emerald-500/5'
      }`}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-xs font-bold mb-3 border border-emerald-500/30">
          <FiServer className="w-4 h-4" /> โมดูลที่ 11 (Module 11 of 12 - Advanced Robotics Masterclass)
        </div>
        <h1 className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          การเชื่อมต่อโครงข่ายอุตสาหกรรม (Fieldbus) &amp; ระบบ MES ยุค Industry 4.0
        </h1>
        <p className={`text-sm md:text-base leading-relaxed max-w-4xl ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          ก้าวข้ามการเดินสายรีเลย์ 24V แบบเก่า สู่การสื่อสารดิจิทัลแบบ Real-Time ด้วย PROFINET IRT, EtherCAT, และมาตรฐานกลาง OPC UA Robotics Companion Specification (VDMA 40010), 
          ลำดับสัญญาณดิจิทัล Handshake ระดับมิลลิวินาที, โครงสร้างข้อมูลคำนวณ OEE (Availability, Performance, Quality), 
          และการแจ้งเตือนซ่อมบำรุงเชิงคาดการณ์ (Predictive Maintenance)
        </p>
      </div>

      {/* Section 1: Evolution of Fieldbus */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-black border border-emerald-500/40">1</span>
          วิวัฒนาการการเชื่อมต่อหุ่นยนต์: จากสายรีเลย์ 24V สู่ Industrial Ethernet
        </h2>
        <div className="overflow-x-auto pb-2 scrollbar-thin rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[680px] text-left text-xs border-collapse">
            <thead className={`font-semibold uppercase text-[11px] border-b ${
              isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              <tr>
                <th className="py-3 px-4 w-[24%]">โปรโตคอล (Protocol)</th>
                <th className="py-3 px-4 w-[25%]">Cycle Time &amp; Jitter</th>
                <th className="py-3 px-4 w-[25%]">การประยุกต์ใช้งานหลัก</th>
                <th className="py-3 px-4 w-[26%]">จุดเด่นทางวิศวกรรม</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-800'}`}>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">1. PROFINET IRT (Siemens Standard)</td>
                <td className="py-3 px-4 font-bold">&lt; 1 ms (Jitter &lt; 1 &mu;s)</td>
                <td className="py-3 px-4">สายการผลิตยานยนต์และชิ้นส่วนอิเล็กทรอนิกส์</td>
                <td className="py-3 px-4">ส่งทั้ง Safety (PROFIsafe) และ Motion บนสาย Cat6 เดียว</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold text-cyan-600 dark:text-cyan-400">2. EtherCAT (Beckhoff Standard)</td>
                <td className="py-3 px-4 font-bold">250 &mu;s - 1 ms</td>
                <td className="py-3 px-4">หุ่นยนต์ Delta ความเร็วสูงและซิงโครไนซ์หลายแกน</td>
                <td className="py-3 px-4">เทคโนโลยี Processing on the fly ประสิทธิภาพบัสสูงสุด</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold text-amber-600 dark:text-amber-400">3. OPC UA Robotics (VDMA 40010)</td>
                <td className="py-3 px-4">10 - 100 ms</td>
                <td className="py-3 px-4">IT/OT Gateway ส่งข้อมูลเข้าสู่ระบบ MES และ Cloud</td>
                <td className="py-3 px-4">มาตรฐานเปิดข้ามแบรนด์ (Fanuc, KUKA, ABB คุยกันได้)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Simulator 11 Embed */}
      <RobotIndustrialFieldbusLab />

      {/* Section 2: OEE Data Dictionary */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-black border border-emerald-500/40">2</span>
          โครงสร้างชุดข้อมูล OEE &amp; การบำรุงรักษาเชิงคาดการณ์ (Predictive Maintenance)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h4 className="font-bold text-emerald-600 dark:text-emerald-300 text-sm">Availability Tracking (ความพร้อมเครื่อง)</h4>
            <p className="leading-relaxed">
              ส่งสถานะบิต: Running, Waiting_Part, Alarm_Stop, E-Stop_Active พร้อมรหัสข้อผิดพลาดเฉพาะจุด (Specific Error Code) 
              เข้าสู่ระบบ MES ทันที เพื่อจำแนกสาเหตุ Downtime แยกตามหมวดหมู่ช่างไฟฟ้า ช่างกล หรือวัตถุดิบหมด
            </p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h4 className="font-bold text-teal-600 dark:text-teal-300 text-sm">Performance Tracking (สมรรถนะการทำงาน)</h4>
            <p className="leading-relaxed">
              บันทึกเวลาทำงานต่อชิ้น (Actual Cycle Time) เปรียบเทียบกับเป้าหมาย Ideal Cycle Time แบบมิลลิวินาที 
              หากพบว่า Cycle Time ช้าลงเกิน 5% ระบบจะเตือนว่าอุปกรณ์จับยึดลมเริ่มมีการรั่วไหล
            </p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h4 className="font-bold text-cyan-600 dark:text-cyan-300 text-sm">Predictive Reducer Life (การสึกหรอกระปุกเกียร์)</h4>
            <p className="leading-relaxed">
              อ่านค่าแรงบิดสะสม (Torque Integral) และอุณหภูมิขดลวดมอเตอร์ คำนวณชั่วโมงอายุการใช้งานของน้ำมันหล่อลื่น (Grease Lifetime Hours) 
              แจ้งเตือนเปลี่ยนถ่ายน้ำมันเกียร์ก่อนเกิดอาการฟันเกียร์แตกหัก
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ========================================================================= */
/* MODULE 12 LESSON: 3D VISION GUIDANCE & AI BIN PICKING 6-DoF               */
/* ========================================================================= */
export function RobotMod12() {
  const { isDark } = useTheme();
  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn">
      {/* Module Header Banner */}
      <div className={`p-6 md:p-8 rounded-2xl border shadow-xl relative overflow-hidden transition-all ${
        isDark 
          ? 'bg-gradient-to-r from-cyan-950/80 via-slate-900 to-blue-950/70 border-cyan-500/30' 
          : 'bg-gradient-to-r from-cyan-50 via-white to-blue-50 border-cyan-300 shadow-cyan-500/5'
      }`}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 text-xs font-bold mb-3 border border-cyan-500/30">
          <FiEye className="w-4 h-4" /> โมดูลที่ 12 (Module 12 of 12 - Capstone Masterclass)
        </div>
        <h1 className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          ระบบนำทางด้วยภาพ 3 มิติ (3D Vision Guidance) &amp; AI Bin Picking 6-DoF
        </h1>
        <p className={`text-sm md:text-base leading-relaxed max-w-4xl ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          การบูรณาการเทคโนโลยีระดับสูงสุดของระบบอัตโนมัติ: การสแกนกลุ่มจุดพิกัด 3 มิติ (3D Point Cloud), 
          อัลกอริทึม AI ค้นหาพิกัดและมุมเอียง 6 องศาอิสระ (6-DoF Pose Estimation), การวางแผนเส้นทางหลบการชนขอบกระบะ (Collision-Free Motion Planning), 
          และการใช้เซนเซอร์วัดแรงข้อมือหุ่นยนต์เพื่อสวมประกอบชิ้นงานแบบยืดหยุ่น (Active Compliance)
        </p>
      </div>

      {/* Section 1: Why 3D Vision for Random Bin Picking */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-cyan-600/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-sm font-black border border-cyan-500/40">1</span>
          ความท้าทายระดับสูงสุด: ทำไมกล้อง 2D จึงแก้ปัญหา Random Bin Picking ไม่ได้?
        </h2>
        <div className="overflow-x-auto pb-2 scrollbar-thin rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[680px] text-left text-xs border-collapse">
            <thead className={`font-semibold uppercase text-[11px] border-b ${
              isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              <tr>
                <th className="py-3 px-4 w-[24%]">ปัจจัยวิศวกรรม</th>
                <th className="py-3 px-4 w-[38%] text-rose-600 dark:text-rose-300">กล้อง 2D Vision แบบดั้งเดิม</th>
                <th className="py-3 px-4 w-[38%] text-cyan-600 dark:text-cyan-400 font-bold">กล้อง 3D Point Cloud + AI 6-DoF</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-800'}`}>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">มิติพิกัดที่ได้ (Degrees of Freedom)</td>
                <td className="py-3 px-4 text-rose-500">ได้เพียง 3 มิติ (X, Y, &theta;) ไม่รู้ความลึก Z</td>
                <td className="py-3 px-4 font-bold text-cyan-600 dark:text-cyan-400">ครบทั้ง 6 มิติ (X, Y, Z, Roll, Pitch, Yaw)</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">การหยิบชิ้นงานที่กองซ้อนทับกัน (Overlapping)</td>
                <td className="py-3 px-4 text-rose-500">หยิบไม่ได้ ไม่รู้ว่าชิ้นใดอยู่บน ชิ้นใดอยู่ล่าง</td>
                <td className="py-3 px-4 font-bold text-cyan-600 dark:text-cyan-400">เลือกหยิบชิ้นงานตัวบนสุดที่ไม่ถูกทับได้อัตโนมัติ</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">การหลบหลีกการชนขอบกระบะเหล็ก (Bin Collision)</td>
                <td className="py-3 px-4 text-rose-500">ทำไม่ได้ หัว Gripper ชนขอบกระบะจนเสียหายบ่อยครั้ง</td>
                <td className="py-3 px-4 font-bold text-cyan-600 dark:text-cyan-400">คำนวณ 3D Envelope หลบขอบกระบะได้ 100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Simulator 12 Embed */}
      <RobotAiVisionBinPickingSimulator />

      {/* Section 2: Hand-Eye Calibration Mathematics */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-cyan-600/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-sm font-black border border-cyan-500/40">2</span>
          คณิตศาสตร์การสอบเทียบพิกัดมือ-ตา (Hand-Eye Calibration Formulation: AX = XB)
        </h2>
        <div className={`p-4 rounded-xl border font-mono text-xs space-y-2 ${
          isDark ? 'bg-slate-950 border-slate-800 text-cyan-300' : 'bg-slate-50 border-slate-200 text-cyan-800'
        }`}>
          <div className="font-bold text-sm text-slate-800 dark:text-white">สมการคลาสสิกของ Tsai-Lenz (Hand-Eye Matrix Formulation):</div>
          <div>A_i &times; X = X &times; B_i</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
            โดย A_i คือการเคลื่อนที่ของหน้าแปลนหุ่นยนต์ระหว่างตำแหน่ง 1 และ 2, B_i คือการเคลื่อนที่ของเป้าสอบเทียบในกล้อง, และ X คือเมทริกซ์การแปลงพิกัดระหว่างกล้องกับฐานหุ่นยนต์ (T_camera_to_base)
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <h4 className="font-bold text-cyan-600 dark:text-cyan-400 text-sm">1. Eye-to-Hand (กล้องติดอยู่กับที่เหนือกระบะ):</h4>
            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
              กล้องติดตั้งอยู่บนโครงสร้างเหนือกระบะชิ้นงาน ข้อดีคือมองเห็นภาพรวมทั้งกระบะตลอดเวลา 
              แขนกลไม่จำเป็นต้องแบกน้ำหนักของกล้อง ทำให้เคลื่อนไหวได้รวดเร็วสูงสุด เหมาะกับงานหยิบของจากกระบะลึก
            </p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <h4 className="font-bold text-teal-600 dark:text-teal-400 text-sm">2. Eye-in-Hand (กล้องติดอยู่ที่ข้อมือแขนกล):</h4>
            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
              กล้องติดอยู่ที่ปลายแขนกล เคลื่อนที่ไปพร้อมกับหัวจับ ข้อดีคือสามารถซูมเข้าไปถ่ายในมุมอับหรือตรวจความเรียบร้อยหลังประกอบได้ 
              ข้อเสียคือเพิ่มน้ำหนัก Payload ให้แขนกล และต้องหยุดนิ่งขณะถ่ายภาพ
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: Commissioning SOP Checklist */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-cyan-600/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-sm font-black border border-cyan-500/40">3</span>
          ขั้นตอนการส่งมอบระบบ AI Bin Picking (Commissioning SOP Checklist)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {[
            { title: '1. Hand-Eye Accuracy Verification', desc: 'ทดสอบให้แขนกลนำพอยน์เตอร์ไปแตะจุดกึ่งกลางลูกบอลสอบเทียบ 10 มุม คลาดเคลื่อนต้องไม่เกิน &plusmn;0.5 mm' },
            { title: '2. Empty Bin Clearance Check', desc: 'ทดสอบการหยิบชิ้นงานชิ้นสุดท้ายที่ติดก้นกระบะ หัว Gripper ต้องไม่ขูดกระแทกขอบหรือก้นกระบะ' },
            { title: '3. Drop Rate Below 0.2%', desc: 'ทดสอบหยิบชิ้นงาน 1,000 ครั้งติดต่อกัน อัตราการทำชิ้นงานหลุดมือ (Grasp Drop Rate) ต้องต่ำกว่า 2 ชิ้น' },
            { title: '4. Cycle Time Sign-off', desc: 'เวลาเฉลี่ยในการสแกน 3D + คำนวณพิกัด AI + แขนกลหยิบวาง ต้องได้ตาม Target Cycle Time (เช่น &le; 6.5 วินาที/ชิ้น)' }
          ].map((item, idx) => (
            <div key={idx} className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <FiCheckCircle className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
              <div>
                <div className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{item.title}</div>
                <div className={`text-[11px] mt-0.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

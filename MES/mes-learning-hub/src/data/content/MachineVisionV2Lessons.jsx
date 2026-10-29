import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  FiCpu,
  FiZap,
  FiEye,
  FiActivity,
  FiSliders,
  FiMaximize2,
  FiLayers,
  FiCheckCircle,
  FiAlertTriangle,
  FiBox,
  FiServer,
  FiWifi,
  FiTrendingUp,
  FiTarget,
  FiRefreshCw,
  FiPlay,
  FiInfo
} from 'react-icons/fi';

/* ========================================================================= */
/* SIMULATOR 1: EDGE NPU ACCELERATION & LATENCY CALCULATOR (Module 1 & 6)    */
/* ========================================================================= */
export function VisionV2EdgeNpuSimulator() {
  const { isDark } = useTheme();
  const [device, setDevice] = useState('JETSON_ORIN'); // 'CPU' | 'JETSON_ORIN' | 'HAILO_8'
  const [quantization, setQuantization] = useState('INT8'); // 'FP32' | 'FP16' | 'INT8'
  const [resolution, setResolution] = useState(640); // 640 | 1280

  // Calculate simulated metrics
  let baseLatency = 45; // ms
  let powerWatts = 15;
  let modelSizeMB = 52;

  if (device === 'CPU') {
    baseLatency = resolution === 640 ? 68 : 190;
    powerWatts = 65;
    modelSizeMB = quantization === 'INT8' ? 14 : quantization === 'FP16' ? 26 : 52;
  } else if (device === 'JETSON_ORIN') {
    baseLatency = resolution === 640 ? (quantization === 'INT8' ? 4.8 : quantization === 'FP16' ? 7.6 : 18.2) : (quantization === 'INT8' ? 14.5 : 28.0);
    powerWatts = 15;
    modelSizeMB = quantization === 'INT8' ? 13 : quantization === 'FP16' ? 26 : 52;
  } else if (device === 'HAILO_8') {
    baseLatency = resolution === 640 ? (quantization === 'INT8' ? 3.2 : 6.1) : 11.2;
    powerWatts = 2.5;
    modelSizeMB = 13;
  }

  const fps = Math.round(1000 / baseLatency);
  const maxLineSpeed = ((fps * 60 * 0.15) / 10).toFixed(1); // m/min approx

  return (
    <div className={`border rounded-2xl p-4 sm:p-6 space-y-6 transition-all ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
    }`}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <FiCpu className="w-5 h-5 text-emerald-500" />
            ห้องแล็บประเมินประสิทธิภาพ Edge NPU &amp; TensorRT Quantization
          </h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            จำลองความเร็วการประมวลผล (Inference Latency), อัตราเฟรมต่อวินาที (FPS), และการประหยัดพลังงานเมื่อย้ายโมเดลจาก PC อุตสาหกรรมสู่ Edge AI NPU
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[
            { id: 'CPU', label: 'IPC Core i7 (No NPU)' },
            { id: 'JETSON_ORIN', label: 'Jetson Orin Nano (40 TOPS)' },
            { id: 'HAILO_8', label: 'Hailo-8 M.2 NPU (26 TOPS)' }
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setDevice(d.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                device === d.id
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                  : isDark 
                    ? 'bg-slate-800 text-slate-400 hover:text-white' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              {d.label}
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
            <FiSliders className="w-4 h-4 text-emerald-500" /> ตั้งค่าการบีบอัดโมเดล
          </h4>

          <div>
            <div className={`text-xs mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>ระดับความแม่นยำ (Precision Mode):</div>
            <div className="grid grid-cols-3 gap-2">
              {['FP32', 'FP16', 'INT8'].map((p) => (
                <button
                  key={p}
                  onClick={() => setQuantization(p)}
                  className={`py-2 rounded-lg text-xs font-mono font-bold border transition-all ${
                    quantization === p
                      ? isDark
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-emerald-50 border-emerald-500 text-emerald-800 font-black'
                      : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <span className={`text-[10px] block mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>INT8 บีบอัดค่าน้ำหนักเหลือ 8 บิต เร็วขึ้น 2-4 เท่า สูญเสียความแม่นยำ &lt;0.5% mAP</span>
          </div>

          <div>
            <div className={`text-xs mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>ความละเอียดภาพนำเข้า (Input Resolution):</div>
            <div className="grid grid-cols-2 gap-2">
              {[640, 1280].map((r) => (
                <button
                  key={r}
                  onClick={() => setResolution(r)}
                  className={`py-2 rounded-lg text-xs font-mono font-bold border transition-all ${
                    resolution === r
                      ? isDark
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-cyan-50 border-cyan-500 text-cyan-900 font-black'
                      : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {r} × {r} px
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'}`}>
              <div className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Inference Time</div>
              <div className="text-2xl font-black text-emerald-500 font-mono mt-1">{baseLatency} ms</div>
              <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>เวลาต่อ 1 เฟรม</div>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'}`}>
              <div className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Throughput</div>
              <div className="text-2xl font-black text-cyan-500 font-mono mt-1">{fps} FPS</div>
              <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>เฟรมต่อวินาที</div>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'}`}>
              <div className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Power Consumption</div>
              <div className="text-2xl font-black text-amber-500 font-mono mt-1">{powerWatts} W</div>
              <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>ความร้อนต่ำ Fanless</div>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'}`}>
              <div className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Max Line Speed</div>
              <div className="text-2xl font-black text-teal-500 font-mono mt-1">{maxLineSpeed} m/min</div>
              <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>ความเร็วสายพานสูงสุด</div>
            </div>
          </div>

          <div className={`p-4 rounded-xl border space-y-2 text-xs ${
            isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>
              <FiInfo className="w-4 h-4" /> สรุปผลการทดสอบสถาปัตยกรรม Edge AI Vision
            </div>
            <p className={`leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              เมื่อแปลงโมเดลสู่ <strong>TensorRT INT8</strong> บนการ์ด <strong>{device}</strong> ระบบสามารถตรวจจับชิ้นงานได้ที่ความเร็ว <strong>{fps} FPS</strong> ซึ่งเร็วกว่าเวลาเดินทางของชิ้นงานบนสายพานถึง 4 เท่า รองรับการส่งสัญญาณ Reject ของเสียได้ทันทีโดยไม่ต้องหน่วงความเร็วสายพาน
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* SIMULATOR 2: 3D PHOTOMETRIC STEREO & SMART OPTICS (Module 2)              */
/* ========================================================================= */
export function VisionV2SmartOptics3DSimulator() {
  const { isDark } = useTheme();
  const [lightingMode, setLightingMode] = useState('4_WAY_STEREO'); // 'DIFFUSE_WHITE' | '4_WAY_STEREO' | 'POLARIZED'
  const [scratchDepth, setScratchDepth] = useState(15); // microns

  return (
    <div className={`border rounded-2xl p-4 sm:p-6 space-y-6 transition-all ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
    }`}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <FiEye className="w-5 h-5 text-indigo-500" />
            ห้องแล็บจำลอง 3D Photometric Stereo &amp; Smart Optics
          </h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            ตรวจสอบรอยขีดข่วนระดับไมครอนบนผิวโลหะสะท้อนแสงสูง (Reflective Metallic Parts) ด้วยการยิงแสง 4 ทิศทางแยกมิติความสูงและความเอียง
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'DIFFUSE_WHITE', label: '1. Standard Diffuse Light (แสงขาวธรรมดา)' },
            { id: 'POLARIZED', label: '2. Cross-Polarizer (ตัดแสงสะท้อนมันวาว)' },
            { id: '4_WAY_STEREO', label: '3. 3D Photometric Stereo (4 ทิศทาง)' }
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setLightingMode(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                lightingMode === m.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : isDark 
                    ? 'bg-slate-800 text-slate-400 hover:text-white' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              {m.label}
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
            <FiSliders className="w-4 h-4 text-indigo-500" /> ขนาดตำหนิบนผิวงาน
          </h4>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>ความลึกรอยขีดข่วน (Scratch Depth):</span>
              <span className="text-indigo-500 font-mono font-bold">{scratchDepth} µm</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={scratchDepth}
              onChange={(e) => setScratchDepth(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          <div className={`p-3 rounded-lg border text-xs space-y-1 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>ชนิดเลนส์ที่ใช้:</span>
            <div className="text-teal-600 font-medium">Liquid Lens (ปรับโฟกัสด้วยแรงดันไฟฟ้า 5ms)</div>
            <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              ไม่มีชิ้นส่วนกลไกเคลื่อนไหว โฟกัสชิ้นงานต่างระดับความสูงได้ทันทีในไลน์ผลิต
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'}`}>
              <div className={`text-xs font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>ภาพ 2D Gray / Albedo Image</div>
              <div className={`h-28 rounded-lg flex items-center justify-center border font-mono text-xs transition-all text-center px-3 ${
                lightingMode === 'DIFFUSE_WHITE'
                  ? isDark ? 'bg-slate-200 text-slate-800 border-white font-bold' : 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                  : lightingMode === 'POLARIZED'
                  ? isDark ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-slate-200 text-slate-700 border-slate-300'
                  : isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {lightingMode === 'DIFFUSE_WHITE' && 'แสงสะท้อนจ้า (Glare Blind Spot) มองไม่เห็นรอย!'}
                {lightingMode === 'POLARIZED' && 'ตัดแสงวาบได้ แต่รอยตื้นๆ ยังกลืนไปกับลายขัดผิว'}
                {lightingMode === '4_WAY_STEREO' && 'แยกภาพสีผิวออกจากความขรุขระชัดเจน'}
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'}`}>
              <div className={`text-xs font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>ภาพ 3D Gradient / Surface Normal Map</div>
              <div className={`h-28 rounded-lg flex items-center justify-center border font-mono text-xs transition-all text-center px-3 ${
                lightingMode === '4_WAY_STEREO'
                  ? isDark 
                    ? 'bg-indigo-950/70 border-indigo-500 text-indigo-300 font-bold shadow-lg shadow-indigo-500/10'
                    : 'bg-indigo-50 border-indigo-400 text-indigo-950 font-bold'
                  : isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-600'
                    : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}>
                {lightingMode === '4_WAY_STEREO' ? (
                  <div className="text-center space-y-1">
                    <div className="text-emerald-500 font-bold">ตรวจพบรอยลึก {scratchDepth} µm ชัดเจน 100%!</div>
                    <div className={`text-[10px] ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>Surface Curvature &amp; Normal Vector Verified</div>
                  </div>
                ) : (
                  'ต้องการแสง 4 ทิศทางเพื่อคำนวณ Normal Map'
                )}
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-xl border space-y-2 text-xs ${
            isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>
              <FiCheckCircle className="w-4 h-4" /> ทำไมโรงงานยุคใหม่จึงต้องใช้ 3D Photometric Stereo?
            </div>
            <p className={`leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              ผิวชิ้นงานปั๊มขึ้นรูปหรือกลึง CNC มักมีคราบน้ำมันและลายทางของเนื้อเหล็ก หากใช้กล้อง 2D ธรรมดาแสงจะสะท้อนเข้าเลนส์จนตาบอด (Over-saturation) แต่เทคโนโลยี <strong>Photometric Stereo</strong> จะถ่ายภาพ 4 ช็อตด้วยแสงไฟวงแหวนแบ่ง 4 ควอดรันต์ใน 1 มิลลิวินาที ทำให้สกัดเฉพาะความลึกของรอย (Topography) ออกมาได้โดยไม่มีแสงสะท้อนมารบกวน
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* SIMULATOR 3: ANCHOR-FREE YOLOv8/v11 & ORIENTED BOUNDING BOX (Module 3)    */
/* ========================================================================= */
export function VisionV2YoloObbSimulator() {
  const { isDark } = useTheme();
  const [boxType, setBoxType] = useState('OBB'); // 'AABB' | 'OBB'
  const [rotationAngle, setRotationAngle] = useState(42); // degrees

  const noiseArea = boxType === 'AABB' ? '48.5%' : '4.2%';
  const graspAccuracy = boxType === 'AABB' ? 'พิกัดกว้างเกินไป (หยิบพลาด)' : 'แม่นยำ 99.8% (พร้อมมุม Roll θ)';

  return (
    <div className={`border rounded-2xl p-4 sm:p-6 space-y-6 transition-all ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
    }`}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <FiTarget className="w-5 h-5 text-amber-500" />
            ห้องแล็บเปรียบเทียบ AABB vs Oriented Bounding Box (OBB - YOLOv11)
          </h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            สาธิตความแตกต่างระหว่างการตีกรอบสี่เหลี่ยมแนวดิ่งแบบเดิม (AABB) กับการตีกรอบหมุนตามองศาชิ้นงาน (OBB) สำหรับแขนกลหยิบชิ้นงาน
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setBoxType('AABB')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              boxType === 'AABB'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                : isDark 
                  ? 'bg-slate-800 text-slate-400 hover:text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            แบบเดิม: Standard AABB (x, y, w, h)
          </button>
          <button
            onClick={() => setBoxType('OBB')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              boxType === 'OBB'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
                : isDark 
                  ? 'bg-slate-800 text-slate-400 hover:text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            แบบใหม่: YOLO OBB (x, y, w, h, θ)
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
            <FiSliders className="w-4 h-4 text-amber-500" /> องศาการเอียงของชิ้นงาน
          </h4>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>มุมหมุนชิ้นงานบนสายพาน:</span>
              <span className="text-amber-500 font-mono font-bold">{rotationAngle}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              step="1"
              value={rotationAngle}
              onChange={(e) => setRotationAngle(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className={`p-3 rounded-lg border text-xs space-y-1 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>โครงสร้างเอาต์พุตโมเดล:</span>
            <div className="font-mono text-cyan-600 text-[11px] font-bold">
              {boxType === 'AABB' ? '[cls, x_c, y_c, w, h]' : '[cls, x1, y1, x2, y2, x3, y3, x4, y4, θ]'}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'}`}>
              <div className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Background Noise Area</div>
              <div className={`text-2xl font-black font-mono mt-1 ${boxType === 'OBB' ? 'text-emerald-500' : 'text-rose-500'}`}>
                {noiseArea}
              </div>
              <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>พื้นที่พื้นหลังที่หลุดเข้ามาในกรอบ</div>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'}`}>
              <div className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Grasp Pose for Robot</div>
              <div className="text-xs font-bold text-teal-600 mt-2">{graspAccuracy}</div>
              <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>ส่งต่อให้ Cobot หยิบ</div>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'}`}>
              <div className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Overlapping Separation</div>
              <div className={`text-xs font-bold mt-2 ${boxType === 'OBB' ? 'text-emerald-500' : 'text-amber-600'}`}>
                {boxType === 'OBB' ? 'แยกชิ้นงานที่เบียดกันได้' : 'กล่องทับซ้อนกันมั่ว (NMS Error)'}
              </div>
              <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Non-Maximum Suppression</div>
            </div>
          </div>

          <div className={`p-4 rounded-xl border text-xs space-y-2 ${
            isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
              <FiInfo className="w-4 h-4" /> สถาปัตยกรรม Anchor-Free ใน YOLOv8 / YOLOv11
            </div>
            <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              ในโมเดลยุคเก่า (YOLOv3-v5) วิศวกรต้องกำหนด Anchor Boxes ล่วงหน้า ถ้าชิ้นงานมีรูปทรงยาวผิดปกติ โมเดลจะตรวจจับไม่ติด แต่ใน <strong>YOLOv8 / YOLOv11</strong> ใช้ระบบ <strong>Anchor-Free</strong> พยากรณ์ระยะห่างจากกึ่งกลางวัตถุไปยังขอบทั้งสี่โดยตรง พร้อมมุมองศาการเอียง <strong>θ</strong> ทำให้ตรวจจับชิ้นงานที่วางเอียงหรือซ้อนกันได้อย่างสมบูรณ์แบบ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* SIMULATOR 4: UNSUPERVISED DEFECT DETECTION (PATCHCORE) LAB (Module 4)     */
/* ========================================================================= */
export function VisionV2PatchCoreAnomalySimulator() {
  const { isDark } = useTheme();
  const [defectType, setDefectType] = useState('SCRATCH'); // 'NONE' | 'SCRATCH' | 'THREAD_BURR' | 'STAIN'
  const [threshold, setThreshold] = useState(0.65);

  let anomalyScore = 0.22;
  if (defectType === 'SCRATCH') anomalyScore = 0.88;
  if (defectType === 'THREAD_BURR') anomalyScore = 0.94;
  if (defectType === 'STAIN') anomalyScore = 0.71;

  const isNG = anomalyScore >= threshold;

  return (
    <div className={`border rounded-2xl p-4 sm:p-6 space-y-6 transition-all ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
    }`}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <FiAlertTriangle className="w-5 h-5 text-rose-500" />
            ห้องแล็บ Unsupervised Anomaly Detection (PatchCore / Anomalib)
          </h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            การตรวจจับของเสียด้วยโมเดลที่ไม่ต้องใช้ภาพ NG แม้แต่รูปเดียว โดยเรียนรู้เฉพาะลักษณะชิ้นงาน OK ปกติ (Zero-Shot / Few-Shot Anomaly Detection)
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'NONE', label: 'ชิ้นงาน OK ปกติ 100%' },
            { id: 'SCRATCH', label: 'รอยขูดขีดที่ไม่เคยเจอ' },
            { id: 'THREAD_BURR', label: 'เกลียวรูด / เสี้ยนโลหะ' },
            { id: 'STAIN', label: 'คราบน้ำมันเปื้อน' }
          ].map((d) => (
            <button
              key={d.id}
              onClick={() => setDefectType(d.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                defectType === d.id
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                  : isDark 
                    ? 'bg-slate-800 text-slate-400 hover:text-white' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              {d.label}
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
            <FiSliders className="w-4 h-4 text-rose-500" /> พารามิเตอร์เกณฑ์ตัดสิน
          </h4>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>เกณฑ์ตัดสินของเสีย (Threshold):</span>
              <span className="text-rose-500 font-mono font-bold">{threshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="0.9"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          <div className={`p-3 rounded-lg border text-xs space-y-1 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className={isDark ? 'text-slate-400' : 'text-slate-600'}>ขนาดฐานข้อมูล Memory Bank:</div>
            <div className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>50 รูปชิ้นงาน OK (Coreset Subsampling)</div>
            <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              ไม่ต้องเสียเวลาเก็บรูปของเสีย 1,000 รูป แค่เทรนรูปชิ้นงานดี 50 รูปใช้เวลาเพียง 2 นาที
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`p-4 rounded-xl border text-center transition-all ${
              isNG 
                ? isDark ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-50 border-rose-300 text-rose-950' 
                : isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-300 text-emerald-950'
            }`}>
              <div className={`text-[10px] uppercase tracking-wider font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>MES Quality Decision</div>
              <div className={`text-2xl font-black font-mono mt-1 ${isNG ? 'text-rose-500' : 'text-emerald-500'}`}>
                {isNG ? 'DEFECT DETECTED (NG)' : 'NORMAL PART (PASS)'}
              </div>
              <div className="text-xs mt-1 font-mono font-bold">
                Anomaly Score: {anomalyScore.toFixed(2)} / Threshold: {threshold.toFixed(2)}
              </div>
            </div>

            <div className={`p-4 rounded-xl border text-center ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'}`}>
              <div className={`text-[10px] uppercase tracking-wider font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Defect Localization Map</div>
              <div className="text-xs font-bold text-cyan-600 mt-2">
                {defectType === 'NONE' ? 'ผิวเรียบเสมอกันทุกจุด' : `ตรวจพบพิกัดผิดปกติที่บริเวณ ${defectType}`}
              </div>
              <div className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Pixel-Level Heatmap Precision</div>
            </div>
          </div>

          <div className={`p-4 rounded-xl border space-y-2 text-xs ${
            isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-rose-300' : 'text-rose-800'}`}>
              <FiCheckCircle className="w-4 h-4" /> ข้อได้เปรียบปฏิวัติวงการ: ทำไม PatchCore ถึงชนะการเทรน AI แบบเดิม?
            </div>
            <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              ในโรงงานจริง ของเสียไม่ได้เกิดขึ้นบ่อย และเมื่อมีของเสียรูปแบบใหม่เกิดขึ้น โมเดล Supervised Learning (ที่ต้องเทรนด้วยรูป NG) จะตรวจไม่เจอและปล่อยหลุดไปหาลูกค้า! แต่โมเดล <strong>PatchCore / FastFlow</strong> จะจดจำเฉพาะโครงสร้างของชิ้นงาน OK หากมีสิ่งแปลกปลอม รอยบุบ หรือเสี้ยนใดๆ ที่ไม่ตรงกับแบบจำลอง ระบบจะตีเป็น <strong>NG ทันที 100%</strong> แม้จะไม่เคยเห็นของเสียชนิดนั้นมาก่อน
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* MODULE 1: NEXT-GEN AI MACHINE VISION ARCHITECTURE                         */
/* ========================================================================= */
export function MachineVisionV2Mod1() {
  const { isDark } = useTheme();
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className={`border-b pb-5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold uppercase tracking-wider mb-2">
          <FiCpu className="w-4 h-4" /> บทที่ 1 (Module 1 - 2026 Edition)
        </div>
        <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          สถาปัตยกรรม Next-Gen AI Machine Vision ยุคปี 2026 &amp; Edge Computing
        </h1>
        <p className={`text-sm mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          ศึกษาวิวัฒนาการจากระบบคอมพิวเตอร์วิทัศน์แบบดั้งเดิม (Classical Rule-Based) สู่สถาปัตยกรรม Edge NPU อัจฉริยะ การประมวลผลแบบไร้คลาวด์ (Zero-Cloud Latency) และการออกแบบไปป์ไลน์ระดับ Microsecond
        </p>
      </div>

      <VisionV2EdgeNpuSimulator />

      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-500 flex items-center justify-center text-sm font-black border border-emerald-500/40">1</span>
          3 เสาหลักของการออกแบบระบบ AI Machine Vision สมัยใหม่
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h3 className="font-bold text-emerald-600 text-sm">1. Edge NPU First</h3>
            <p className="leading-relaxed">
              การรันโมเดล AI ในโรงงานต้องทำที่หน้างาน (On-Premises Edge) 100% ด้วยชิป Neural Processing Unit (NPU) อย่าง NVIDIA Jetson Orin หรือ Hailo-8 เพื่อความหน่วงเวลาต่ำกว่า 5ms และป้องกันสายการผลิตหยุดทำงานกรณีอินเทอร์เน็ตหลุด
            </p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h3 className="font-bold text-cyan-600 text-sm">2. Zero-Downtime Retraining</h3>
            <p className="leading-relaxed">
              ระบบวิชันยุคใหม่เชื่อมต่อฐานข้อมูลภาพกับระบบ MLOps สามารถอัปเดตโมเดลเวอร์ชันใหม่แบบ Shadow Deployment (รันเปรียบเทียบเบื้องหลัง) ก่อนสลับใช้งานจริงโดยไม่ต้องหยุดเครื่องจักร
            </p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h3 className="font-bold text-amber-600 text-sm">3. Deterministic Fieldbus Integration</h3>
            <p className="leading-relaxed">
              สัญญาณคัดแยกชิ้นงาน (Reject Trigger) ไม่ส่งผ่าน TCP/IP ธรรมดา แต่ยิงตรงเข้า PLC ผ่าน PROFINET IRT หรือ EtherCAT ที่มี Jitter ไม่เกิน 1 ไมโครวินาที ป้องกันการยิงลมเตะชิ้นงานผิดตำแหน่ง
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ========================================================================= */
/* MODULE 2: SMART OPTICS, HIGH-SPEED CMOS & 3D PHOTOMETRIC STEREO           */
/* ========================================================================= */
export function MachineVisionV2Mod2() {
  const { isDark } = useTheme();
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className={`border-b pb-5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2 text-indigo-500 text-xs font-bold uppercase tracking-wider mb-2">
          <FiEye className="w-4 h-4" /> บทที่ 2 (Module 2 - 2026 Edition)
        </div>
        <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          เทคโนโลยีเซนเซอร์ภาพความเร็วสูง, เลนส์ Smart Optics &amp; 3D Photometric Stereo
        </h1>
        <p className={`text-sm mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          เจาะลึกเทคโนโลยีเซนเซอร์ภาพ Global Shutter CMOS ความเร็วสูง เลนส์ของเหลวปรับโฟกัสอัตโนมัติ (Liquid Lens) และเทคนิค 3D Photometric Stereo เพื่อตรวจสอบผิวสัมผัสระดับไมครอน
        </p>
      </div>

      <VisionV2SmartOptics3DSimulator />

      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-500 flex items-center justify-center text-sm font-black border border-indigo-500/40">1</span>
          ความก้าวหน้าด้านเลนส์และเซนเซอร์อุตสาหกรรม
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h3 className="font-bold text-indigo-600 text-sm">Liquid Lenses (เลนส์ของเหลวควบคุมด้วยไฟฟ้า)</h3>
            <p className="leading-relaxed">
              ใช้หลักการ Electrowetting ปรับความโค้งของหยดของเหลวด้วยแรงดันไฟฟ้า ทำให้สามารถเปลี่ยนระยะโฟกัสได้ภายใน 5 มิลลิวินาที ทนทานการเปลี่ยนระยะโฟกัสมากกว่า 100 ล้านครั้ง เหมาะกับงานกล่องสินค้าที่มีความสูงหลากหลายบนสายพานเดียวกัน
            </p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h3 className="font-bold text-teal-600 text-sm">3D Photometric Stereo Inspection</h3>
            <p className="leading-relaxed">
              การผสานแสง 4 ควอดรันต์เพื่อสกัด 3D Surface Gradient Map ขจัดปัญหาภาพสะท้อนแสงหลอกตา (Specular Reflection) และมองเห็นรอยขูดขีด รอยบุบ หรืออักษรปั๊มจมบนเนื้อโลหะได้อย่างสมบูรณ์แบบ
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ========================================================================= */
/* MODULE 3: ANCHOR-FREE YOLOv8/v11 & ORIENTED BOUNDING BOX (OBB)            */
/* ========================================================================= */
export function MachineVisionV2Mod3() {
  const { isDark } = useTheme();
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className={`border-b pb-5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2 text-amber-500 text-xs font-bold uppercase tracking-wider mb-2">
          <FiTarget className="w-4 h-4" /> บทที่ 3 (Module 3 - 2026 Edition)
        </div>
        <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          สถาปัตยกรรม Anchor-Free YOLOv8/v11 &amp; Oriented Bounding Boxes (OBB)
        </h1>
        <p className={`text-sm mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          ยกระดับการตรวจจับวัตถุจากการตีกรอบสี่เหลี่ยมแนวดิ่งแบบเดิม สู่การหมุนกรอบตามองศาชิ้นงานจริง (Oriented Bounding Boxes) เพิ่มความแม่นยำในการระบุพิกัดให้แขนกลหยิบจับ และขจัดพื้นที่รบกวนของฉากหลัง
        </p>
      </div>

      <VisionV2YoloObbSimulator />

      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-amber-600/30 text-amber-500 flex items-center justify-center text-sm font-black border border-amber-500/40">1</span>
          ทำไม OBB ถึงเป็นมาตรฐานใหม่ของโรงงานอัจฉริยะ?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h3 className="font-bold text-amber-600 text-sm">การหยิบจับชิ้นงานที่วางเบียดกัน (Densely Packed)</h3>
            <p className="leading-relaxed">
              เมื่อชิ้นงานทรงยาววางติดกัน กรอบแนวดิ่งเดิมจะซ้อนทับกันจนคำสั่ง NMS ลบทิ้ง แต่ OBB มีขอบเขตแนบสนิทกับตัววัตถุ ทำให้ตรวจจับชิ้นงานได้ครบ 100% ไม่มีชิ้นตกหล่น
            </p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h3 className="font-bold text-teal-600 text-sm">การหาตำแหน่งเชื่อมหรือขันสกรู</h3>
            <p className="leading-relaxed">
              OBB ให้มุมเอียงระนาบชิ้นงาน (Part Rotation Angle) ช่วยให้แขนกลปรับหัวขันน็อตหมุนตามแนวชิ้นงานได้ทันทีโดยไม่ต้องใช้โปรแกรม Pattern Matching ซับซ้อน
            </p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h3 className="font-bold text-cyan-600 text-sm">ลดอัตราของดีถูกตีเป็นของเสีย (False Overkill)</h3>
            <p className="leading-relaxed">
              ขจัดพื้นที่พื้นหลัง (Background Noise) ออกจากกรอบพยากรณ์ ลดความผิดพลาดจากคราบเปื้อนบนสายพานที่ติดเข้าไปในกล่องสี่เหลี่ยมแบบเดิม
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ========================================================================= */
/* MODULE 4: UNSUPERVISED DEFECT DETECTION (PATCHCORE / FASTFLOW)            */
/* ========================================================================= */
export function MachineVisionV2Mod4() {
  const { isDark } = useTheme();
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className={`border-b pb-5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2 text-rose-500 text-xs font-bold uppercase tracking-wider mb-2">
          <FiAlertTriangle className="w-4 h-4" /> บทที่ 4 (Module 4 - 2026 Edition)
        </div>
        <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          การตรวจจับของเสียแบบไม่ใช้ข้อมูล NG (PatchCore / FastFlow / Anomalib)
        </h1>
        <p className={`text-sm mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          แก้ปัญหาคลาสสิกของโรงงานอุตสาหกรรม: ไม่มีรูปของเสียเพียงพอสำหรับการเทรน AI ด้วยอัลกอริทึม Unsupervised Anomaly Detection เรียนรู้ลักษณะชิ้นงาน OK ปกติ และตรวจจับความผิดปกติที่คาดไม่ถึงได้ 100%
        </p>
      </div>

      <VisionV2PatchCoreAnomalySimulator />

      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-rose-600/30 text-rose-500 flex items-center justify-center text-sm font-black border border-rose-500/40">1</span>
          กลไกการทำงานของ PatchCore ในระดับลึก
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h3 className="font-bold text-rose-600 text-sm">1. Feature Extraction &amp; Coreset Memory Bank</h3>
            <p className="leading-relaxed">
              ใช้ Pre-trained Network (เช่น WideResNet50) สกัดเวกเตอร์ลักษณะเด่นระดับชิ้นส่วนย่อย (Patch-level features) จากรูปภาพชิ้นงานดี แล้วทำการสุ่มตัวอย่างแบบ Coreset Reduction เหลือเฉพาะเวกเตอร์ตัวแทนที่จำเป็นเพียง 1-10% เพื่อให้รันได้เร็วในระดับมิลลิวินาที
            </p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h3 className="font-bold text-cyan-600 text-sm">2. Nearest Neighbor Distance Scoring</h3>
            <p className="leading-relaxed">
              เมื่อชิ้นงานใหม่วิ่งผ่านกล้อง ระบบจะเปรียบเทียบระยะห่างทางคณิตศาสตร์ (Euclidean distance) ระหว่างแพทช์ในรูปใหม่กับข้อมูลใน Memory Bank หากระยะห่างเกินค่า Threshold ระบบจะสร้าง Anomaly Heatmap ระบายสีแดงตรงจุดที่เป็นของเสียทันที
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ========================================================================= */
/* MODULE 5: VISION TRANSFORMERS (ViT) & SEGMENT ANYTHING (SAM 2)            */
/* ========================================================================= */
export function MachineVisionV2Mod5() {
  const { isDark } = useTheme();
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className={`border-b pb-5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2 text-cyan-500 text-xs font-bold uppercase tracking-wider mb-2">
          <FiLayers className="w-4 h-4" /> บทที่ 5 (Module 5 - 2026 Edition)
        </div>
        <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Vision Transformers (ViT) &amp; Segment Anything Model (SAM 2) ในงานอุตสาหกรรม
        </h1>
        <p className={`text-sm mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          ทำความเข้าใจการปฏิวัติวงการวิทัศน์เครื่องจักรด้วยกลไก Self-Attention เข้าใจบริบทภาพโดยรวม และการนำโมเดลรากฐาน (Foundation Models) เช่น Meta SAM 2 มาใช้สร้างหน้ากากแบ่งส่วนชิ้นงาน (Instance Segmentation) แบบเรียลไทม์
        </p>
      </div>

      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-cyan-600/30 text-cyan-500 flex items-center justify-center text-sm font-black border border-cyan-500/40">1</span>
          CNNs vs. Vision Transformers (ViT) ในการตรวจจับความผิดปกติ
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h3 className={`font-bold text-sm ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>CNNs (Convolutional Neural Networks): จุดเด่นและข้อจำกัด</h3>
            <p className="leading-relaxed">
              มองเห็นเฉพาะบริเวณแคบๆ (Local Receptive Field) จากการเลื่อนเคอร์เนล 3x3 หรือ 5x5 ดีสำหรับการหารอยขีดข่วนเล็กๆ แต่อ่อนแอในการจับความสัมพันธ์ระยะไกล เช่น ลวดลายวงจรพิมพ์ PCB ที่เชื่อมโยงข้ามแผง
            </p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-cyan-500/10 border-cyan-500/30 text-slate-300' : 'bg-cyan-50 border-cyan-200 text-cyan-950'
          }`}>
            <h3 className="font-bold text-cyan-600 text-sm">Vision Transformers (ViT): Global Self-Attention</h3>
            <p className="leading-relaxed">
              แบ่งภาพออกเป็น Patch 16x16 แล้วคำนวณ Self-Attention ระหว่างทุกแพทช์ในภาพพร้อมกัน ทำให้เข้าใจโครงสร้างทางเรขาคณิตของชิ้นงานประกอบทั้งตัว ตรวจจับชิ้นส่วนขาดหาย (Missing Components) หรือชิ้นส่วนผิดทิศทางได้อย่างแม่นยำสูง
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ========================================================================= */
/* MODULE 6: EDGE AI DEPLOYMENT & TENSORRT INT8 QUANTIZATION                  */
/* ========================================================================= */
export function MachineVisionV2Mod6() {
  const { isDark } = useTheme();
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className={`border-b pb-5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold uppercase tracking-wider mb-2">
          <FiCpu className="w-4 h-4" /> บทที่ 6 (Module 6 - 2026 Edition)
        </div>
        <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          การปรับปรุงประสิทธิภาพโมเดล AI (Model Optimization) &amp; TensorRT INT8
        </h1>
        <p className={`text-sm mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          ขั้นตอนการแปลงโมเดลจาก PyTorch สู่ ONNX และ TensorRT Engine, การปรับลดความแม่นยำ (Post-Training Quantization - PTQ) เหลือ INT8 ด้วยชุดข้อมูล Calibrator เพื่อให้ได้ความเร็วระดับไมโครวินาที
        </p>
      </div>

      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-500 flex items-center justify-center text-sm font-black border border-emerald-500/40">1</span>
          ไปป์ไลน์การบีบอัดโมเดลเพื่อการทำงานบน Edge NPU
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="text-emerald-600 font-mono font-bold">1. PyTorch / ONNX</div>
            <p>บันทึกโมเดลพร้อมโครงสร้าง Graph และแปลงเป็นมาตรฐาน ONNX</p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="text-emerald-600 font-mono font-bold">2. Layer Fusion</div>
            <p>รวม Conv + BatchNorm + ReLU เข้าด้วยกันเพื่อลด Memory Bandwidth Bottleneck</p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="text-emerald-600 font-mono font-bold">3. INT8 Calibration</div>
            <p>ใช้ภาพตัวอย่าง 100 ภาพสร้าง Scale Factor แปลงค่าน้ำหนักจาก FP32 เป็น INT8</p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="text-emerald-600 font-mono font-bold">4. C++ Runtime</div>
            <p>โหลด Engine รันด้วย Zero-Copy CUDA Memory ร่วมกับกล้อง GigE Vision</p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ========================================================================= */
/* MODULE 7: REAL-TIME REJECT, PROFINET & MES INTEGRATION                     */
/* ========================================================================= */
export function MachineVisionV2Mod7() {
  const { isDark } = useTheme();
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className={`border-b pb-5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2 text-rose-500 text-xs font-bold uppercase tracking-wider mb-2">
          <FiServer className="w-4 h-4" /> บทที่ 7 (Module 7 - 2026 Edition)
        </div>
        <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          ระบบขับดันของเสียความเร็วสูง (High-Speed Reject), PROFINET IRT &amp; MES
        </h1>
        <p className={`text-sm mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          การบูรณาการระบบวิชันเข้ากับกลไกทางกายภาพ: การคำนวณ Shift Register พิกัดสายพานด้วย Rotary Encoder, การควบคุมวาล์วลมเตะของเสีย (Air Jet Rejector), และการส่งข้อมูลสถิติ Defect Pareto Chart เข้าสู่ระบบ MES
        </p>
      </div>

      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-rose-600/30 text-rose-500 flex items-center justify-center text-sm font-black border border-rose-500/40">1</span>
          การทำงานประสานกันระหว่าง AI Vision, PLC, และ MES
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h3 className="font-bold text-cyan-600 text-sm">Encoder Shift Register Tracking</h3>
            <p className="leading-relaxed">
              เมื่อกล้องถ่ายภาพ ณ พัลส์เอนโค้ดเดอร์ที่ 12450 หากโมเดลตัดสินเป็น NG ระบบจะใส่บิต 1 ลงใน Shift Register ของ PLC เมื่อสายพานวิ่งไปถึงหัวเตะของเสียที่พัลส์ 14200 โซลินอยด์วาล์วจะยิงลมเตะชิ้นงานลงถังขยะอย่างแม่นยำ 100% แม้ความเร็วสายพานจะเปลี่ยน
            </p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h3 className="font-bold text-amber-600 text-sm">PROFINET IRT Real-Time Bus</h3>
            <p className="leading-relaxed">
              การสื่อสารผ่านบัสความเร็วสูงระดับไมโครวินาที ทำให้ส่งผลการตัดสิน Pass/Fail, ชนิดของเสีย, และตำแหน่งข้อบกพร่องไปยังโมดูล I/O ได้ทันทีโดยไม่เกิดปัญหา Buffer Latency
            </p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h3 className="font-bold text-emerald-600 text-sm">Automated MES Quality Logging</h3>
            <p className="leading-relaxed">
              ภาพของเสียพร้อมกรอบความผิดปกติจะถูกส่งไปเก็บใน Image Storage Server และบันทึกรหัสของเสียเข้าฐานข้อมูล MES ผูกกับ Work Order อัตโนมัติ เพื่อให้ผู้จัดการฝ่ายผลิตเห็น Defect Pareto Chart แบบสดๆ
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

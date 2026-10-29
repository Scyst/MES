import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { IndustrialPhotoCard, PhotoComparisonPair } from '../../components/IndustrialPhotoGallery';
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
/* MODULE 1: ADVANCED AI MACHINE VISION ARCHITECTURE                         */
/* ========================================================================= */
/* ========================================================================= */
/* MODULE 1: ADVANCED AI MACHINE VISION ARCHITECTURE & EDGE COMPUTING       */
/* ========================================================================= */
export function MachineVisionV2Mod1() {
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
          <FiCpu className="w-4 h-4" /> โมดูลที่ 1 (Module 1 of 7 - Advanced Masterclass)
        </div>
        <h1 className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          สถาปัตยกรรมระบบ AI Machine Vision ขั้นสูง &amp; การประมวลผล Edge Computing
        </h1>
        <p className={`text-sm md:text-base leading-relaxed w-full ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          ศึกษาวิวัฒนาการการปฏิวัติจากระบบคอมพิวเตอร์วิทัศน์แบบตั้งเกณฑ์ดั้งเดิม (Classical Rule-Based) สู่สถาปัตยกรรม Edge NPU อัจฉริยะ 
          การประมวลผลแบบไร้คลาวด์ (Zero-Cloud Latency), การคำนวณงบประมาณเวลาไปป์ไลน์ระดับไมโครวินาที (Microsecond Latency Budget) 
          และการรับประกันการทำงานแบบ Deterministic ร่วมกับระบบควบคุมอัตโนมัติ PLC และฐานข้อมูล MES
        </p>
      </div>

      {/* Section 1: Evolution of Vision Architectures */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-black border border-emerald-500/40">1</span>
          วิวัฒนาการ 3 ยุคของระบบตรวจสอบชิ้นงานในโรงงานอุตสาหกรรม
        </h2>
        <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          ในอดีตการตรวจสอบด้วยกล้องอุตสาหกรรมอาศัยฟังก์ชันทางคณิตศาสตร์เชิงเส้น (Morphology, Sobel Filter, Blob Analysis) ซึ่งมีความเปราะบางอย่างยิ่งเมื่อสภาพแสงหน้างานเปลี่ยนไป 
          แม้กระทั่งการนำ AI ยุคแรกมารันผ่าน Cloud API ก็ก่อให้เกิดปัญหาความหน่วงเวลาและข้อมูลความลับรั่วไหล ยุคปัจจุบันจึงเป็นยุคของ <strong>On-Premises Edge NPU</strong> อย่างแท้จริง:
        </p>

        <div className="overflow-x-auto pb-2 scrollbar-thin rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[680px] text-left text-xs border-collapse">
            <thead className={`font-semibold uppercase text-[11px] border-b ${
              isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              <tr>
                <th className="py-3 px-4 w-[22%]">เกณฑ์การประเมิน (Criteria)</th>
                <th className="py-3 px-4 w-[26%] text-amber-600 dark:text-amber-300">ยุค 1: Classical Rule-Based</th>
                <th className="py-3 px-4 w-[26%] text-rose-600 dark:text-rose-300">ยุค 2: Cloud-Based AI</th>
                <th className="py-3 px-4 w-[26%] text-emerald-600 dark:text-emerald-400 font-bold">ยุค 3: Industrial Edge NPU Native</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-800'}`}>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">Inference Latency (เวลาประมวลผล)</td>
                <td className="py-3 px-4">10 - 50 ms (จำกัดเฉพาะฟังก์ชันง่ายๆ)</td>
                <td className="py-3 px-4 text-rose-500 font-semibold">200 - 1,500 ms (แบนด์วิดท์อินเทอร์เน็ต)</td>
                <td className="py-3 px-4 font-black text-emerald-600 dark:text-emerald-400">1.8 - 6.5 ms (รันบนชิป Tensor Core / NPU)</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">ความทนทานต่อสภาพแสง (Lighting Robustness)</td>
                <td className="py-3 px-4 text-rose-500">ต่ำมาก (แสงเปลี่ยน 5% ส่งผลให้ Reject ผิด)</td>
                <td className="py-3 px-4 text-emerald-600">สูง (โมเดล Deep Learning เข้าใจบริบท)</td>
                <td className="py-3 px-4 font-black text-emerald-600 dark:text-emerald-400">สูงมาก (Data Augmentation + Polarized NPU)</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">ความเสถียรของไลน์ผลิต (Offline Reliability)</td>
                <td className="py-3 px-4 text-emerald-600">รันในตู้คอนโทรลเลอร์ 100% ไม่ต้องใช้อินเทอร์เน็ต</td>
                <td className="py-3 px-4 text-rose-500 font-semibold">เน็ตหลุด = ไลน์ผลิตหยุดชะงัก (Line Stop)</td>
                <td className="py-3 px-4 font-black text-emerald-600 dark:text-emerald-400">100% Standalone On-Premises ไร้กังวลเน็ตหลุด</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">ความปลอดภัยข้อมูลโรงงาน (IP Protection)</td>
                <td className="py-3 px-4">ภาพไม่เคยหลุดออกจากเครื่องตรวจ</td>
                <td className="py-3 px-4 text-rose-500">เสี่ยงภาพชิ้นส่วนต้นแบบหลุดออกนอกเครือข่าย</td>
                <td className="py-3 px-4 font-black text-emerald-600 dark:text-emerald-400">ภาพจัดเก็บเฉพาะใน Local Storage Server / MES</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">การตรวจจับของเสียที่ไม่เคยพบ (Unknown Defects)</td>
                <td className="py-3 px-4">ทำไม่ได้ ต้องเขียนเงื่อนไขคณิตศาสตร์เพิ่มทีละแบบ</td>
                <td className="py-3 px-4">ทำไม่ได้ หากไม่ได้เทรนรูป NG ชนิดนั้นมาก่อน</td>
                <td className="py-3 px-4 font-black text-emerald-600 dark:text-emerald-400">ทำได้ 100% ด้วย Unsupervised Anomaly Detection</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Mathematical Formulations & Latency Budget */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-black border border-emerald-500/40">2</span>
          การคำนวณงบประมาณเวลาไปป์ไลน์ (Pipeline Latency Budget Formula)
        </h2>
        <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          ในการออกแบบระบบ AI Machine Vision สำหรับสายการผลิตอัตโนมัติความเร็วสูง (High-Speed Conveyor) วิศวกรต้องคำนวณงบประมาณเวลาอย่างเข้มงวด 
          เพื่อให้แน่ใจว่าระบบสามารถวิเคราะห์ผลและส่งสัญญาณไฟฟ้าเตะของเสีย (Reject Trigger) ได้ทันก่อนที่ชิ้นงานจะเคลื่อนที่เลยตำแหน่งหัวเตะ:
        </p>

        <div className={`p-4 rounded-xl border font-mono text-xs space-y-2 ${
          isDark ? 'bg-slate-950 border-slate-800 text-emerald-300' : 'bg-slate-50 border-slate-200 text-emerald-800'
        }`}>
          <div className="font-bold text-sm text-slate-800 dark:text-white">สมการควบคุมเวลาไปป์ไลน์ (Total Inspection Latency):</div>
          <div>T_total = T_trig + T_exp + T_readout + T_pre + T_infer + T_post + T_fieldbus &le; T_max</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
            โดยที่ T_max คือเวลาที่ชิ้นงานเดินทางจากจุดกึ่งกลางเลนส์กล้องไปถึงกระบอกสูบเตะของเสีย: T_max = D_reject / V_conveyor
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <h4 className="font-bold text-emerald-600 dark:text-emerald-300 text-sm">ตัวอย่างการคำนวณจากไลน์ผลิตจริง (Case Study):</h4>
            <ul className="space-y-1 text-slate-700 dark:text-slate-300 list-disc list-inside leading-relaxed">
              <li>ความเร็วสายพานลำเลียง (V_conveyor) = <strong>1.5 m/s</strong> (1,500 mm/s)</li>
              <li>ระยะทางจากจุดถ่ายรูปถึงหัวเตะลม (D_reject) = <strong>300 mm</strong></li>
              <li>เวลาเดินทางสูงสุดที่ยอมรับได้: <strong>T_max = 300 / 1,500 = 0.200 วินาที (200 ms)</strong></li>
              <li>หากไปป์ไลน์ใช้เวลารวม 210 ms หัวเตะจะยิงลมโดนชิ้นงานดีตัวถัดไปทันที (False Rejection Disaster)</li>
            </ul>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <h4 className="font-bold text-cyan-600 dark:text-cyan-300 text-sm">การจัดสรรเวลาบน Edge NPU Architecture:</h4>
            <div className="space-y-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
              <div className="flex justify-between"><span>1. Hardware Photoelectric Trigger:</span> <span>0.05 ms</span></div>
              <div className="flex justify-between"><span>2. Camera Exposure &amp; GigE Readout:</span> <span>8.20 ms</span></div>
              <div className="flex justify-between"><span>3. CUDA Pre-processing (Resize/Norm):</span> <span>0.85 ms</span></div>
              <div className="flex justify-between"><span className="text-emerald-600 dark:text-emerald-400 font-bold">4. TensorRT INT8 Model Inference:</span> <span className="font-bold">4.10 ms</span></div>
              <div className="flex justify-between"><span>5. NMS &amp; Decision Logic:</span> <span>0.40 ms</span></div>
              <div className="flex justify-between"><span>6. PROFINET IRT Bit Dispatch to PLC:</span> <span>0.25 ms</span></div>
              <div className="border-t border-slate-300 dark:border-slate-600 pt-1 flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                <span>เวลารวมทั้งหมด (Total Time):</span> <span>13.85 ms &lt;&lt; 200 ms (Margin ปลอดภัย 93%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Master Variable & Constant Breakdown Table */}
        <div className={`p-4 rounded-xl border space-y-3 ${
          isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <FiInfo className="w-4 h-4 text-emerald-500" />
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
              ตารางแจกแจงที่มาและหน่วยของตัวแปรทั้งหมดในสมการไปป์ไลน์ (Pipeline Variables &amp; Units Origin)
            </h4>
          </div>
          <div className="overflow-x-auto pb-1 scrollbar-thin">
            <table className="w-full min-w-[620px] text-left text-xs border-collapse">
              <thead className={`font-mono text-[10px] uppercase border-b ${
                isDark ? 'text-slate-400 border-slate-800 bg-slate-900/60' : 'text-slate-600 border-slate-200 bg-slate-100'
              }`}>
                <tr>
                  <th className="py-2 px-3 w-[16%]">ตัวแปร / ค่าคงที่</th>
                  <th className="py-2 px-3 w-[14%]">หน่วย (Unit)</th>
                  <th className="py-2 px-3 w-[35%]">ความหมายทางวิศวกรรม</th>
                  <th className="py-2 px-3 w-[35%]">ที่มาของตัวเลขหน้างานจริง</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-emerald-500">T_trig</td>
                  <td className="py-2 px-3 font-mono text-[11px]">มิลลิวินาที (ms)</td>
                  <td>เวลาตอบสนองการตรวจจับชิ้นงานหน้ากล้อง</td>
                  <td>เซนเซอร์ลำแสง Photoelectric + วงจรแยกสัญญาณ Optocoupler (~0.05 ms)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-emerald-500">T_exp</td>
                  <td className="py-2 px-3 font-mono text-[11px]">มิลลิวินาที (ms)</td>
                  <td>เวลาเปิดรับแสงของชัตเตอร์เซนเซอร์ภาพ</td>
                  <td>คำนวณจากกฎป้องกันภาพเบลอ: T_exp &le; Pixel_Size / V_conveyor (~0.5 - 2.0 ms)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-emerald-500">T_readout</td>
                  <td className="py-2 px-3 font-mono text-[11px]">มิลลิวินาที (ms)</td>
                  <td>เวลาอ่านค่า ADC พิกเซลและส่งผ่านสาย GigE</td>
                  <td>ความเร็วแบนด์วิดท์สายแลน GigE 1,000 Mbps หรือ USB3 Vision (~8 - 15 ms)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-emerald-500">T_pre</td>
                  <td className="py-2 px-3 font-mono text-[11px]">มิลลิวินาที (ms)</td>
                  <td>เวลาเตรียมสเกลภาพบน GPU/NPU</td>
                  <td>ฟังก์ชัน Letterbox Resize, Normalization, Transpose HWC &rarr; CHW (~0.8 ms)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-emerald-500">T_infer</td>
                  <td className="py-2 px-3 font-mono text-[11px]">มิลลิวินาที (ms)</td>
                  <td>เวลาประมวลผลคำนวณโมเดลโครงข่ายประสาทเทียม</td>
                  <td>พลังประมวลผลของชิป AI (NPU/GPU) ที่บีบอัด INT8 (~3.0 - 5.0 ms)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-emerald-500">T_post</td>
                  <td className="py-2 px-3 font-mono text-[11px]">มิลลิวินาที (ms)</td>
                  <td>เวลาประมวลผลผลลัพธ์และกรองกล่องซ้ำซ้อน</td>
                  <td>อัลกอริทึม Rotated NMS, Bounding Box Coordinate Remap (~0.4 ms)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-emerald-500">T_fieldbus</td>
                  <td className="py-2 px-3 font-mono text-[11px]">มิลลิวินาที (ms)</td>
                  <td>เวลาส่งบิตคำสั่ง OK/NG ไปยัง PLC เครื่องจักร</td>
                  <td>รอบเวลาสแกนเครือข่ายอุตสาหกรรม PROFINET IRT / EtherCAT Cycle (~0.25 ms)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-cyan-500">D_reject</td>
                  <td className="py-2 px-3 font-mono text-[11px]">มิลลิเมตร (mm)</td>
                  <td>ระยะทางจากจุดถ่ายรูปถึงหัวเตะของเสีย</td>
                  <td>วัดจริงหน้างานด้วยตลับเมตรตามแนวสายพานลำเลียง (Conveyor Machine Layout)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-cyan-500">V_conveyor</td>
                  <td className="py-2 px-3 font-mono text-[11px]">มม./วิ (mm/s)</td>
                  <td>ความเร็วการเคลื่อนที่เชิงเส้นของสายพาน</td>
                  <td>อ่านค่าความถี่จาก Rotary Encoder หรือความเร็วรอบมอเตอร์อินเวอร์เตอร์ (VFD)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-amber-500">T_max</td>
                  <td className="py-2 px-3 font-mono text-[11px]">มิลลิวินาที (ms)</td>
                  <td>เดดไลน์เวลาสูงสุดที่ชิ้นงานจะเคลื่อนที่เลยหัวเตะ</td>
                  <td>คำนวณจาก T_max = (D_reject / V_conveyor) &times; 1,000</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Simulator 1 Embed */}
      <VisionV2EdgeNpuSimulator />

      {/* Real Hardware Spotlight: Line Scan & Area Scan Cameras */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <IndustrialPhotoCard 
          src="./images/hardware/gige_camera_setup.jpg"
          fallbackSrc="/images/hardware/gige_camera_setup.jpg"
          badge="อุปกรณ์จริง (Real Setup)"
          badgeColor="cyan"
          title="กล้องอุตสาหกรรม Area Scan พร้อมเลนส์ C-Mount สำหรับสายพาน"
          subtitle="การติดตั้งชุดกล้อง GigE Vision ในไลน์ผลิตจริง"
          specs={[
            { label: 'พอร์ตเชื่อมต่อ', value: 'GigE (1,000 Mbps PoE)' },
            { label: 'ชนิดเซนเซอร์', value: 'CMOS Global Shutter' },
            { label: 'การส่งข้อมูล', value: 'GigE Vision v2.1' },
            { label: 'I/O Interface', value: 'Opto-Isolated 24V' }
          ]}
          description="ภาพถ่ายกล้องอุตสาหกรรมจริง (SVS-Vistek EXO Series) ที่เชื่อมต่อเข้ากับ Industrial PC ผ่านสายเคเบิล GigE แบบขันเกลียวล็อก รองรับการส่งภาพด้วย Zero-Copy DMA Driver ตรงเข้าสู่ VRAM ของการ์ดจอโดยไม่ผ่าน CPU"
          checkpoints={[
            'ใช้สายแลน Cat6A STP แบบมี Shield ถักสองชั้นเพื่อป้องกันสัญญาณรบกวนจากมอเตอร์และอินเวอร์เตอร์',
            'ปรับตั้งค่า Jumbo Frames (MTU = 9000) บนการ์ดแลนของ IPC เพื่อให้ส่งภาพได้ลื่นไหลไร้เฟรมดรอป'
          ]}
        />

        <IndustrialPhotoCard 
          src="./images/hardware/line_scan_camera.jpg"
          fallbackSrc="/images/hardware/line_scan_camera.jpg"
          badge="อุปกรณ์จริง (Line Scan)"
          badgeColor="indigo"
          title="กล้องสแกนแนวเส้นความเร็วสูง (Line Scan Camera System)"
          subtitle="ตรวจจับตำหนิบนสายการผลิตต่อเนื่องความเร็วสูง"
          specs={[
            { label: 'ความละเอียด', value: '8192 พิกเซลแนวนอน' },
            { label: 'Line Rate', value: 'สูงสุด 140,000 บรรทัด/วินาที' },
            { label: 'ความเร็วสายพาน', value: 'รองรับได้ถึง 500 เมตร/นาที' },
            { label: 'การซิงค์', value: 'Rotary Encoder Pulse' }
          ]}
          description="ภาพถ่ายกล้อง Line Scan อุตสาหกรรมจริงสำหรับการตรวจจับพื้นผิวแผ่นโลหะม้วนและชิ้นงานความเร็วสูง ตัวกล้องจะรับสัญญาณพัลส์จาก Rotary Encoder เพื่อให้ความเร็วการกวาดภาพเท่ากับความเร็วสายพาน 100%"
          checkpoints={[
            'ต้องคำนวณอัตราส่วนพัลส์ของ Encoder ต่อนิ้วหรือมิลลิเมตร (Line Pitch Sync) อย่างแม่นยำเพื่อป้องกันภาพยืดหรือหด',
            'ต้องใช้ไฟแท่งความสว่างสูงพิเศษระบายความร้อนด้วยฮีตซิงก์ขนาดใหญ่'
          ]}
        />
      </div>

      {/* Section 3: Hardware NPU Specifications & Zero-Copy Pipelines */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-black border border-emerald-500/40">3</span>
          สถาปัตยกรรมฮาร์ดแวร์ Edge NPU &amp; Zero-Copy Shared Memory
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h3 className="font-bold text-emerald-600 dark:text-emerald-300 text-sm">Unified Memory Architecture</h3>
            <p className="leading-relaxed">
              ใน PC แบบเดิม CPU และ GPU แยกหน่วยความจำกัน การส่งภาพขนาด 5MB ผ่าน PCIe Bus เสียเวลาถึง 8-15ms 
              แต่บนบอร์ด Jetson Orin สถาปัตยกรรม <strong>Unified Memory</strong> ทำให้ CPU และ NPU เข้าถึง RAM ก้อนเดียวกันได้ทันทีแบบ Zero-Copy
            </p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h3 className="font-bold text-cyan-600 dark:text-cyan-300 text-sm">M.2 PCIe NPU Accelerator (Hailo-8)</h3>
            <p className="leading-relaxed">
              สำหรับการอัปเกรดคอมพิวเตอร์อุตสาหกรรม (IPC) เดิม สามารถเสียบการ์ด Hailo-8 M.2 ซึ่งให้พลังคำนวณสูงถึง 26 TOPS 
              โดยใช้พลังงานเพียง 2.5 วัตต์ โครงสร้าง Dataflow Architecture รันโมเดล YOLOv8 ได้มากกว่า 100 FPS โดยไม่ต้องมีพัดลมระบายความร้อน
            </p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h3 className="font-bold text-amber-600 dark:text-amber-300 text-sm">Zero-Downtime MLOps Deployment</h3>
            <p className="leading-relaxed">
              ระบบวิชันระดับโรงงานเชื่อมต่อกับ Docker Container เมื่อเทรนโมเดลเวอร์ชันใหม่สำเร็จ ระบบจะส่งโมเดลลง Edge Device และรันแบบ 
              <strong>Shadow Inference</strong> (รันเปรียบเทียบเบื้องหลัง 24 ชม.) ก่อนสลับใช้งานจริงโดยสายการผลิตไม่ต้องหยุดแม้แต่วินาทีเดียว
            </p>
          </div>
        </div>
      </section>

      {/* Section 4: Factory Troubleshooting Scenarios */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-black border border-emerald-500/40">4</span>
          กรณีศึกษาหน้างานและแนวทางแก้ปัญหาความผิดปกติ (Factory Troubleshooting SOP)
        </h2>
        <div className="space-y-3 text-xs">
          <div className={`p-4 rounded-xl border space-y-1.5 ${
            isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span className="text-rose-500 flex items-center gap-1.5"><FiAlertTriangle /> อาการที่ 1: ระบบเกิดภาพค้างกระตุกสุ่มทุก 15-30 นาที และชิ้นงานหลุดรอด</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 border border-rose-500/30">High Severity</span>
            </div>
            <p><strong>สาเหตุรากเหง้า (Root Cause):</strong> การใช้งาน Python ในกระบวนการ Capture ภาพ เกิดปัญหา Garbage Collection (GC) หยุดการทำงานของเธรด และระบบปฏิบัติการ Windows ทำการสลับ Process Background</p>
            <p className="text-emerald-600 dark:text-emerald-400"><strong>มาตรการแก้ไข (Countermeasure):</strong> เขียน Pipeline ใหม่ด้วยภาษา C++ บน Linux RT-Kernel (PREEMPT_RT) กำหนด CPU Core Affinity ล็อกให้ NPU Inference รันบน Core 4-7 แบบเฉพาะเจาะจง ขจัดอาการ Jitter ได้ 100%</p>
          </div>

          <div className={`p-4 rounded-xl border space-y-1.5 ${
            isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span className="text-amber-500 flex items-center gap-1.5"><FiAlertTriangle /> อาการที่ 2: Edge NPU ร้อนจนความเร็วตก (Thermal Throttling) ในช่วงฤดูร้อน</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/30">Medium Severity</span>
            </div>
            <p><strong>สาเหตุรากเหง้า (Root Cause):</strong> ตู้คอนโทรลเลอร์หน้างานอุณหภูมิพุ่งสูงถึง 52°C ชิป GPU ความร้อนสะสมเกิน 85°C จนฮาร์ดแวร์ลดความถี่ Clock ลงครึ่งหนึ่ง ส่งผลให้ Inference Time เพิ่มขึ้นจาก 4ms เป็น 14ms</p>
            <p className="text-emerald-600 dark:text-emerald-400"><strong>มาตรการแก้ไข (Countermeasure):</strong> แปลงโมเดลจาก FP16 สู่ INT8 Precision ลดการใช้พลังงานลง 65% ร่วมกับติดตั้งชุดฮีตซิงก์อลูมิเนียมเกรดอุตสาหกรรม (Passive Fin Enclosure) รองรับการทำงานต่อเนื่องได้ที่ 60°C สบายๆ</p>
          </div>
        </div>
      </section>

      {/* Section 5: Standard Operating Procedure (SOP) Checklist */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-black border border-emerald-500/40">5</span>
          ใบตรวจสอบมาตรฐานวิศวกรรม (Engineering Commissioning SOP Checklist)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {[
            { title: '1. Hardware Watchdog Verification', desc: 'ตั้งค่า Watchdog Timer ใน NPU ให้รีบูตอัตโนมัติภายใน 500ms หากซอฟต์แวร์ตรวจค้าง' },
            { title: '2. Deterministic Fieldbus Handshake', desc: 'ทดสอบการส่งบิต Reject ไปยัง PLC ผ่าน PROFINET/EtherCAT มี Jitter ไม่เกิน 1 ไมโครวินาที' },
            { title: '3. Image Buffer Overflow Protection', desc: 'มี Circular Ring Buffer ใน RAM ป้องกันภาพล้นกรณีเครือข่าย MES ภายนอกตอบสนองช้า' },
            { title: '4. IATF 16949 Blind Testing', desc: 'ทดสอบปล่อยชิ้นงานตัวอย่างทองคำ (Golden Sample) OK 50 ชิ้น และ NG 50 ชิ้น ตรวจจับถูกต้อง 100%' }
          ].map((item, idx) => (
            <div key={idx} className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <FiCheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
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
/* MODULE 2: SMART OPTICS, HIGH-SPEED CMOS & 3D PHOTOMETRIC STEREO           */
/* ========================================================================= */
export function MachineVisionV2Mod2() {
  const { isDark } = useTheme();
  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn">
      {/* Module Header Banner */}
      <div className={`p-6 md:p-8 rounded-2xl border shadow-xl relative overflow-hidden transition-all ${
        isDark 
          ? 'bg-gradient-to-r from-indigo-950/80 via-slate-900 to-blue-950/70 border-indigo-500/30' 
          : 'bg-gradient-to-r from-indigo-50 via-white to-blue-50 border-indigo-300 shadow-indigo-500/5'
      }`}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-xs font-bold mb-3 border border-indigo-500/30">
          <FiEye className="w-4 h-4" /> โมดูลที่ 2 (Module 2 of 7 - Advanced Masterclass)
        </div>
        <h1 className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          เทคโนโลยีเซนเซอร์ภาพความเร็วสูง, เลนส์ Smart Optics &amp; 3D Photometric Stereo
        </h1>
        <p className={`text-sm md:text-base leading-relaxed w-full ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          เจาะลึกสถาปัตยกรรมเซนเซอร์ภาพ Global Shutter CMOS ความเร็วสูง, เทคโนโลยีเลนส์ของเหลว (Liquid Lenses) ปรับโฟกัสระดับมิลลิวินาที, 
          สมการคำนวณป้องกันภาพเบลอจากการเคลื่อนที่ (Motion Blur Equation), และเทคนิค 3D Photometric Stereo สกัดแผนที่เวกเตอร์พื้นผิว 4 ทิศทาง
        </p>
      </div>

      {/* Section 1: Sensor Shutter Technologies */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-black border border-indigo-500/40">1</span>
          ความลึกของเทคโนโลยีเซนเซอร์ภาพ: Global Shutter vs Rolling Shutter vs TDI
        </h2>
        <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          ในงานตรวจจับชิ้นงานบนสายพานลำเลียง ชนิดของชัตเตอร์คือปัจจัยชี้ชะตาระหว่างภาพคมชัดระดับไมครอนกับภาพบิดเบี้ยวจนระบบตัดสินผิดพลาด 
          กล้องเกรดผู้บริโภคทั่วไปใช้ Rolling Shutter ซึ่งอ่านค่าทีละแถว ทำให้เกิดเอฟเฟกต์ภาพเอียง (Jello Effect) ขณะที่เซนเซอร์อุตสาหกรรมขั้นสูงใช้ Global Shutter Pregius S:
        </p>

        <div className="overflow-x-auto pb-2 scrollbar-thin rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[680px] text-left text-xs border-collapse">
            <thead className={`font-semibold uppercase text-[11px] border-b ${
              isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              <tr>
                <th className="py-3 px-4 w-[24%]">คุณสมบัติทางเทคนิค (Specification)</th>
                <th className="py-3 px-4 w-[25%] text-rose-600 dark:text-rose-300">Rolling Shutter (CMOS ทั่วไป)</th>
                <th className="py-3 px-4 w-[25%] text-indigo-600 dark:text-indigo-400 font-bold">Global Shutter (Industrial)</th>
                <th className="py-3 px-4 w-[26%] text-teal-600 dark:text-teal-400 font-bold">TDI Line Scan (เว็บต่อเนื่อง)</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-800'}`}>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">กลไกการรับแสง (Exposure Mechanism)</td>
                <td className="py-3 px-4 text-rose-500">เปิดรับแสงทีละบรรทัดจากบนลงล่าง</td>
                <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">ทุกพิกเซลเปิดและปิดพร้อมกันในพริบตาเดียว</td>
                <td className="py-3 px-4">สแกนทีละเส้นประสานความเร็วกับเอนโค้ดเดอร์</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">ความผิดเพี้ยนเชิงเรขาคณิต (Geometric Distortion)</td>
                <td className="py-3 px-4 text-rose-500 font-semibold">วัตถุกลมจะกลายเป็นรูปไข่ (Oval Distortion)</td>
                <td className="py-3 px-4 font-black text-indigo-600 dark:text-indigo-400">0% ไร้ความผิดเพี้ยน วัดขนาดได้ &plusmn;0.002 mm</td>
                <td className="py-3 px-4">สมบูรณ์แบบเมื่อ Sync Pulse สม่ำเสมอ</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">การประสานกับไฟแฟลช (Strobe Synchronization)</td>
                <td className="py-3 px-4 text-rose-500">ทำได้ยาก แสงสว่างไม่สม่ำเสมอทั่วภาพ</td>
                <td className="py-3 px-4 text-indigo-600 dark:text-indigo-400 font-bold">แฟลชยิงจังหวะสั้น 10 &mu;s ได้ภาพคมชัดกริบ</td>
                <td className="py-3 px-4">ต้องใช้ไฟ Bar Light สว่างต่อเนื่องความเข้มสูง</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">งานที่เหมาะสมในโรงงาน (Ideal Applications)</td>
                <td className="py-3 px-4">กล้องวงจรปิด CCTV, ชิ้นงานหยุดนิ่ง</td>
                <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">ชิ้นส่วนยานยนต์, อิเล็กทรอนิกส์, บรรจุภัณฑ์</td>
                <td className="py-3 px-4">แผ่นฟอยล์แบตเตอรี่ EV, ม้วนเหล็ก, สิ่งทอ</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Motion Blur Calculations & Liquid Lens Science */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-black border border-indigo-500/40">2</span>
          คณิตศาสตร์การคำนวณ Motion Blur &amp; เทคโนโลยีเลนส์ของเหลว (Liquid Lens)
        </h2>
        <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          ภาพที่เบลอจากการเคลื่อนที่แม้เพียง 2 พิกเซลก็เพียงพอที่จะทำให้อัลกอริทึม Deep Learning ตรวจจับรอยขีดข่วนพลาด วิศวกรต้องคำนวณ Exposure Time สูงสุดที่อนุญาต:
        </p>

        <div className={`p-4 rounded-xl border font-mono text-xs space-y-2 ${
          isDark ? 'bg-slate-950 border-slate-800 text-indigo-300' : 'bg-slate-50 border-slate-200 text-indigo-800'
        }`}>
          <div className="font-bold text-sm text-slate-800 dark:text-white">สมการควบคุมความคมชัด (Maximum Exposure Time Equation):</div>
          <div>B_pixel = (V_conveyor &times; T_exposure) / Pixel_Size_Object &le; 1.0 Pixel</div>
          <div>T_exposure_max = (Pixel_Size_Object) / V_conveyor</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
            โดย Pixel_Size_Object = FOV_width / Sensor_Resolution_width (มิลลิเมตรต่อพิกเซล)
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <h4 className="font-bold text-indigo-600 dark:text-indigo-300 text-sm">ตัวอย่างการคำนวณ Exposure Time:</h4>
            <ul className="space-y-1 text-slate-700 dark:text-slate-300 list-disc list-inside leading-relaxed">
              <li>ขนาดขอบเขตการมองเห็น (FOV) = <strong>150 mm</strong></li>
              <li>กล้องความละเอียด 3,000 พิกเซล &rarr; <strong>Pixel Size = 150 / 3,000 = 0.05 mm/pixel</strong></li>
              <li>ความเร็วสายพาน = <strong>1,200 mm/s</strong> (1.2 m/s)</li>
              <li><strong>T_exposure_max = 0.05 / 1,200 = 0.0000416 s = 41.6 &mu;s</strong></li>
              <li>สรุป: ต้องตั้งค่าชัตเตอร์ไม่เกิน <strong>40 &mu;s</strong> และใช้ไฟ Strobe ความเข้มสูงชดเชยแสง</li>
            </ul>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <h4 className="font-bold text-teal-600 dark:text-teal-300 text-sm">หลักการวิทยาศาสตร์ของ Liquid Lens (Electrowetting):</h4>
            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
              เลนส์ของเหลวใช้หยดน้ำมันและน้ำมันนำไฟฟ้าประกบกัน เมื่อจ่ายแรงดันไฟฟ้า (0 - 60V) จะเกิดปรากฏการณ์ 
              <strong>Electrowetting</strong> เปลี่ยนมุมสัมผัสของของเหลว ทำให้ความยาวโฟกัสเปลี่ยนไปภายในเวลาเพียง <strong>5 - 15 มิลลิวินาที</strong> 
              โดยไม่มีชิ้นส่วนกลไกเคลื่อนไหว ทนทานการเปลี่ยนโฟกัสได้มากกว่า 100 ล้านครั้ง เหมาะอย่างยิ่งสำหรับสินค้าที่ความสูงไม่เท่ากัน
            </p>
          </div>
        </div>
      </section>

      {/* Simulator 2 Embed */}
      <VisionV2SmartOptics3DSimulator />

      {/* Section 3: 3D Photometric Stereo Algorithm Deep Dive */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-black border border-indigo-500/40">3</span>
          เจาะลึกอัลกอริทึม 3D Photometric Stereo (Lambertian Reflection Model)
        </h2>
        <div className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            บนชิ้นงานโลหะปั๊มขึ้นรูปหรือชุบโครเมียม แสงไฟทิศทางเดียวจะสะท้อนเข้าเลนส์กล้องจนเกิดแสงวาบขาวจ้า (Specular Saturation) บดบังรอยแตก 
            เทคโนโลยี <strong>3D Photometric Stereo</strong> แก้ปัญหานี้ด้วยการใช้ไฟวงแหวนแบ่ง 4 ทิศทาง (เหนือ, ใต้, ออก, ตก) ฉายแสงทีละทิศทางอย่างรวดเร็วใน 1 ms:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border space-y-2 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h4 className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">สมการเมทริกซ์การสกัด Surface Normal:</h4>
              <div className="font-mono text-[11px] text-slate-800 dark:text-slate-300">
                <div>[I_1, I_2, I_3, I_4]^T = &rho; &times; [S_1, S_2, S_3, S_4]^T &times; N</div>
                <div className="mt-1 text-slate-500">โดย I คือค่าความสว่าง, S คือเวกเตอร์ทิศทางแสง, N คือเวกเตอร์แนวฉากผิว (Surface Normal), &rho; คือค่าการสะท้อน (Albedo)</div>
              </div>
            </div>
            <div className={`p-4 rounded-xl border space-y-2 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <h4 className="font-bold text-teal-600 dark:text-teal-400 text-sm">ผลลัพธ์ที่ได้จากการแยก 2 มิติ:</h4>
              <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                <li><strong>ภาพ Albedo (Texture Map):</strong> มีเฉพาะสีและลวดลาย ปราศจากเงาและแสงสะท้อนจ้า 100%</li>
                <li><strong>ภาพ Surface Normal (Shape Map):</strong> แสดงเฉพาะความลึก ความเอียง และรอยขูดขีดระดับไมครอนอย่างคมกริบ</li>
              </ul>
            </div>
          </div>

          {/* Master Photometric Variable Breakdown Table */}
          <div className={`p-4 rounded-xl border space-y-3 mt-3 ${
            isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              <FiInfo className="w-4 h-4 text-indigo-500" />
              <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                ตารางแจกแจงที่มาและหน่วยของสมการ 3D Photometric Stereo
              </h4>
            </div>
            <div className="overflow-x-auto pb-1 scrollbar-thin">
              <table className="w-full min-w-[620px] text-left text-xs border-collapse">
                <thead className={`font-mono text-[10px] uppercase border-b ${
                  isDark ? 'text-slate-400 border-slate-800 bg-slate-900/60' : 'text-slate-600 border-slate-200 bg-slate-100'
                }`}>
                  <tr>
                    <th className="py-2 px-3 w-[15%]">สัญลักษณ์</th>
                    <th className="py-2 px-3 w-[18%]">หน่วย (Unit)</th>
                    <th className="py-2 px-3 w-[33%]">ความหมายเชิงฟิสิกส์</th>
                    <th className="py-2 px-3 w-[34%]">ที่มาและการคำนวณ</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
                  <tr>
                    <td className="py-2 px-3 font-mono font-bold text-indigo-400">I_1 .. I_4</td>
                    <td className="py-2 px-3 font-mono text-[11px]">เกรย์สเกล (0 - 255 DN)</td>
                    <td>ค่าความสว่างของพิกเซลเมื่อยิงไฟแต่ละทิศทาง</td>
                    <td>อ่านได้จากพิกเซลภาพถ่ายจริงทั้ง 4 ภาพ (North, East, South, West)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-mono font-bold text-indigo-400">&rho; (Albedo)</td>
                    <td className="py-2 px-3 font-mono text-[11px]">สัมประสิทธิ์ (0.00 - 1.00)</td>
                    <td>ค่าสัมประสิทธิ์การสะท้อนแสงจำเพาะของเนื้อวัสดุ</td>
                    <td>คุณสมบัติการสะท้อนแสงตามธรรมชาติของผิวชิ้นงาน เช่น โลหะขัดเงา, พลาสติก</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-mono font-bold text-indigo-400">S (Light Matrix)</td>
                    <td className="py-2 px-3 font-mono text-[11px]">มิติ 4 &times; 3 (เวกเตอร์หนึ่งหน่วย)</td>
                    <td>พิกัดมุมองศาเชิงพื้นที่ของหลอดไฟ LED แต่ละดวง</td>
                    <td>ได้จากการคาลิเบรตมุมโคมไฟด้วยลูกทรงกลมสะท้อนแสง (Specular Chrome Ball)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-mono font-bold text-indigo-400">N (Normal Vector)</td>
                    <td className="py-2 px-3 font-mono text-[11px]">[n_x, n_y, n_z] (Unit Vector)</td>
                    <td>เวกเตอร์ตั้งฉากกับระนาบผิว ณ จุดพิกัดนั้นๆ</td>
                    <td>แก้สมการด้วย Moore-Penrose Pseudo-Inverse: N = (S^T S)^(-1) S^T (I / &rho;)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Real Hardware Spotlight: 4-Way Photometric Stereo Rig */}
        <div className="pt-2">
          <IndustrialPhotoCard 
            src="./images/lighting/photometric_stereo.jpg"
            fallbackSrc="/images/lighting/photometric_stereo.jpg"
            badge="การติดตั้งอุปกรณ์จริง (Photometric Rig)"
            badgeColor="indigo"
            title="ชุดหัวไฟ LED 4 ทิศทาง (Photometric Stereo Head) ในห้องแล็บวิศวกรรม"
            subtitle="ระบบไฟยิงทีละควอดรันต์ (North/South/East/West) สำหรับสกัดเวกเตอร์ความลึก 3 มิติ"
            specs={[
              { label: 'ชนิดโคมไฟ', value: '4-Quadrant LED Strobe' },
              { label: 'ความเร็วแฟลช', value: '100 &mu;s ต่อทิศทาง' },
              { label: 'การควบคุม', value: 'Trigger Sequencer Box' },
              { label: 'ข้อมูลที่ส่งออก', value: 'Albedo Map + Surface Normal' }
            ]}
            description="ภาพถ่ายชุดไฟ 4-Quadrant Photometric Stereo ของจริงในห้องทดสอบออปติก ตัวกล้องจะควบคุมกล่อง Sequencer ให้กระพริบแฟลชทีละทิศทางติดต่อกัน 4 เฟรมในเวลาเพียง 2 มิลลิวินาที ซอฟต์แวร์ประมวลผลแก้สมการ Lambertian Model ได้แผนผังความสูงของพื้นผิว นูน/เว้า ระดับไมโครเมตรออกมาอย่างสมบูรณ์แบบ"
            checkpoints={[
              'ชิ้นงานต้องอยู่นิ่งขณะกระพริบแฟลชทั้ง 4 ทิศทาง หากสายพานเคลื่อนที่เร็วต้องใช้กล้องความเร็วสูงระดับ &gt;200 FPS',
              'หลีกเลี่ยงการติดตั้งในจุดที่มีแสงรบกวนจากภายนอก (Ambient Light) หรือครอบฝาป้องกันแสงรอบสถานีตรวจ'
            ]}
          />
        </div>
      </section>

      {/* Section 4: Factory Troubleshooting Scenarios */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-black border border-indigo-500/40">4</span>
          กรณีศึกษาหน้างานจริงและวิธีแก้ไข (Optics &amp; Lighting Failure Analysis)
        </h2>
        <div className="space-y-3 text-xs">
          <div className={`p-4 rounded-xl border space-y-1.5 ${
            isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span className="text-rose-500 flex items-center gap-1.5"><FiAlertTriangle /> อาการที่ 1: ตรวจสอบรอยแตกร้าวบนกระป๋องอลูมิเนียมแล้วแสงสะท้อนจ้าจนภาพขาวโพลน</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 border border-rose-500/30">High Severity</span>
            </div>
            <p><strong>สาเหตุรากเหง้า (Root Cause):</strong> ผิวกระป๋องโค้งมนทำหน้าที่เสมือนกระจกนูน สะท้อนแสงไฟจาก Direct Ring Light เข้าหน้าเลนส์ตรงๆ</p>
            <p className="text-emerald-600 dark:text-emerald-400"><strong>มาตรการแก้ไข (Countermeasure):</strong> เปลี่ยนเป็นไฟ Diffuse Dome Light 360 องศา แสงจะสะท้อนจากผนังโดมโค้งลงทุกทิศทาง ขจัดแสงสะท้อนวาบได้ 100% ทำให้มองเห็นรอยแตกร้าวบนผิวกระป๋องคมชัด</p>
          </div>

          <div className={`p-4 rounded-xl border space-y-1.5 ${
            isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span className="text-amber-500 flex items-center gap-1.5"><FiAlertTriangle /> อาการที่ 2: รอยสลัก Laser Marking บนโลหะเงาอ่านไม่ออกด้วยกล้องมุม 90 องศา</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/30">Medium Severity</span>
            </div>
            <p><strong>สาเหตุรากเหง้า (Root Cause):</strong> รอยเลเซอร์มีความตื้นระดับ 5 ไมครอน แสงส่องตรงลงมาทำให้ทั้งพื้นผิวและรอยสลักสะท้อนแสงกลับเท่ากันจนไร้ Contrast</p>
            <p className="text-emerald-600 dark:text-emerald-400"><strong>มาตรการแก้ไข (Countermeasure):</strong> ใช้ไฟแบบ Low-Angle Darkfield Ring Light ทำมุม 10-15 องศาขนานกับระนาบชิ้นงาน แสงส่วนใหญ่จะสะท้อนออกไปข้างๆ ส่วนรอยสลักเลเซอร์จะกระเจิงแสงเข้าสู่กล้อง เกิดตัวหนังสือสีขาวสว่างบนพื้นหลังสีดำสนิท (High Contrast 20:1)</p>
          </div>
        </div>
      </section>

      {/* Section 5: Optics Maintenance SOP Checklist */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-black border border-indigo-500/40">5</span>
          คู่มือการบำรุงรักษาเลนส์และระบบแสงสว่าง (Optics Maintenance SOP Checklist)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {[
            { title: '1. Lens Cleaning Protocol', desc: 'ใช้เฉพาะกระดาษเช็ดเลนส์และน้ำยา Isopropyl Alcohol (IPA) 99.9% เช็ดวนเป็นก้นหอยจากจุดศูนย์กลางออกด้านนอก ห้ามใช้ผ้าธรรมดา' },
            { title: '2. Working Distance (WD) Locking', desc: 'ใช้ประแจหกเหลี่ยมล็อกวงแหวนปรับโฟกัสและรูรับแสง (Aperture Iris) ให้แน่น ป้องกันการเคลื่อนจากแรงสั่นสะเทือนของเครื่องจักร' },
            { title: '3. Strobe Light Current Monitoring', desc: 'ตรวจสอบคอนโทรลเลอร์ขับแสงไฟ Overdrive ไม่ให้ปล่อยกระแสเกิน 400% นานเกิน 100 ไมโครวินาที ป้องกันหลอด LED เสื่อมสภาพ' },
            { title: '4. Flat Field Correction (FFC)', desc: 'ทำการ Calibrate แผ่นกระดาษสีขาวมาตรฐานทุก 3 เดือน เพื่อชดเชยการลดทอนแสงที่ขอบภาพ (Lens Vignetting Compensation)' }
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
/* MODULE 3: ANCHOR-FREE YOLOv8/v11 & ORIENTED BOUNDING BOX (OBB)            */
/* ========================================================================= */
export function MachineVisionV2Mod3() {
  const { isDark } = useTheme();
  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn">
      {/* Module Header Banner */}
      <div className={`p-6 md:p-8 rounded-2xl border shadow-xl relative overflow-hidden transition-all ${
        isDark 
          ? 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-orange-950/70 border-amber-500/30' 
          : 'bg-gradient-to-r from-amber-50 via-white to-orange-50 border-amber-300 shadow-amber-500/5'
      }`}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 text-xs font-bold mb-3 border border-amber-500/30">
          <FiTarget className="w-4 h-4" /> โมดูลที่ 3 (Module 3 of 7 - Advanced Masterclass)
        </div>
        <h1 className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          สถาปัตยกรรม Anchor-Free YOLOv8/v11 &amp; Oriented Bounding Boxes (OBB)
        </h1>
        <p className={`text-sm md:text-base leading-relaxed w-full ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          ยกระดับการตรวจจับวัตถุจากการตีกรอบสี่เหลี่ยมแนวดิ่งแบบดั้งเดิม สู่การหมุนกรอบแนบสนิทตามองศาชิ้นงานจริง (OBB), 
          การคำนวณพิกัดมุม 5 พารามิเตอร์และ 8 พิกัดรูปหลายเหลี่ยม, การแก้ปัญหาการกระโดดของมุม (Angle Boundary Loss), 
          และการแปลงพิกัดภาพส่งต่อให้แขนกลหุ่นยนต์หยิบจับได้อย่างแม่นยำระดับเสี้ยวองศา
        </p>
      </div>

      {/* Section 1: Evolution from Anchor-Based to Anchor-Free OBB */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-amber-600/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm font-black border border-amber-500/40">1</span>
          ทำไมโรงงานยุคใหม่จึงต้องเปลี่ยนจาก AABB สู่ Oriented Bounding Box (OBB)?
        </h2>
        <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          ในการตรวจจับชิ้นงานอุตสาหกรรม ชิ้นงานมักวางเอียงบนสายพานหรือกองทับกันในกระบะ การตีกรอบสี่เหลี่ยมแนวดิ่งขนานแกนภาพ (Axis-Aligned Bounding Box - AABB) 
          จะกินพื้นที่ฉากหลังมากเกินไป และทำให้ขั้นตอน Non-Maximum Suppression (NMS) ลบกล่องของชิ้นงานข้างเคียงทิ้ง:
        </p>

        <div className="overflow-x-auto pb-2 scrollbar-thin rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[680px] text-left text-xs border-collapse">
            <thead className={`font-semibold uppercase text-[11px] border-b ${
              isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              <tr>
                <th className="py-3 px-4 w-[24%]">มิติการเปรียบเทียบ (Feature)</th>
                <th className="py-3 px-4 w-[38%] text-rose-600 dark:text-rose-300">กรอบแนวดิ่งเดิม AABB (x, y, w, h)</th>
                <th className="py-3 px-4 w-[38%] text-amber-600 dark:text-amber-400 font-bold">กรอบหมุนตามวัตถุ OBB (x, y, w, h, &theta;)</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-800'}`}>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">พื้นที่สัญญาณรบกวนฉากหลัง (Background Noise)</td>
                <td className="py-3 px-4 text-rose-500">สูงมาก (มากถึง 40 - 60% ของพื้นที่กล่องคือฉากหลัง)</td>
                <td className="py-3 px-4 font-bold text-amber-600 dark:text-amber-400">ต่ำมาก (&lt; 5% กรอบแนบสนิทกับตัวเนื้อวัตถุ)</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">การตรวจจับชิ้นงานที่วางเบียดกัน (Densely Packed)</td>
                <td className="py-3 px-4 text-rose-500">กล่องทับซ้อนกันมั่ว คำสั่ง NMS ลบทิ้งจนชิ้นงานหาย</td>
                <td className="py-3 px-4 font-bold text-amber-600 dark:text-amber-400">แยกแยะชิ้นงานติดกันได้ 100% ด้วย Rotated NMS</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">ข้อมูลมุมเอียงสำหรับแขนกลหุ่นยนต์ (Robot Grasp Pose)</td>
                <td className="py-3 px-4">ไม่มีข้อมูลมุมเอียง ต้องเขียนอัลกอริทึมหมุนหาต่อ</td>
                <td className="py-3 px-4 font-bold text-amber-600 dark:text-amber-400">ส่งค่ามุม &theta; ตรงเข้า Controller หุ่นยนต์พร้อมหยิบทันที</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">ความไวต่อการตัดสินค้าดีเป็นของเสีย (False Overkill)</td>
                <td className="py-3 px-4 text-rose-500">เกิดบ่อย เนื่องจากคราบเปื้อนบนสายพานหลุดเข้ากรอบ</td>
                <td className="py-3 px-4 font-bold text-amber-600 dark:text-amber-400">ลด False Overkill ลงได้มากกว่า 85%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Mathematical Formulations of Rotated Boxes */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-amber-600/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm font-black border border-amber-500/40">2</span>
          คณิตศาสตร์ของ Oriented Bounding Box: การคำนวณมุมและ Rotated IoU
        </h2>
        <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          ในการแสดงผล OBB มี 2 รูปแบบมาตรฐานคือ รูปแบบ 5 พารามิเตอร์ (x<sub>c</sub>, y<sub>c</sub>, w, h, &theta;) และรูปแบบจุดพิกัด 8 จุด (x<sub>1</sub>, y<sub>1</sub>, x<sub>2</sub>, y<sub>2</sub>, x<sub>3</sub>, y<sub>3</sub>, x<sub>4</sub>, y<sub>4</sub>):
        </p>

        <div className={`p-4 rounded-xl border font-mono text-xs space-y-2 ${
          isDark ? 'bg-slate-950 border-slate-800 text-amber-300' : 'bg-slate-50 border-slate-200 text-amber-800'
        }`}>
          <div className="font-bold text-sm text-slate-800 dark:text-white">สมการแปลงจุดพิกัดมุมกล่อง (Rotation Matrix Transformation):</div>
          <div>[x_i, y_i]^T = [x_c, y_c]^T + R(&theta;) &times; [&plusmn;w/2, &plusmn;h/2]^T</div>
          <div>โดย R(&theta;) = [[cos &theta;, -sin &theta;], [sin &theta;, cos &theta;]]</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
            การวัดความแม่นยำในการเทรนใช้ Probabilistic IoU โดยแปลงกรอบหมุนเป็นเกาส์เซียน 2 มิติ (2D Gaussian Distribution) เพื่อขจัดปัญหาการกระโดดของมุม
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <h4 className="font-bold text-amber-600 dark:text-amber-300 text-sm">ปัญหา Angle Boundary Periodicity:</h4>
            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
              เมื่อวัตถุหมุนรอบแกน ค่ามุมจะเกิดการกระโดดจาก +90&deg; เป็น -90&deg; หากใช้สมการ Loss แบบดั้งเดิม (L1/Smooth L1) 
              โมเดลจะมองว่าความคลาดเคลื่อนสูงถึง 180&deg; ทำให้การเทรนไม่ลู่เข้า (Training Instability) 
              ใน YOLOv11 จึงเปลี่ยนไปใช้ <strong>Gaussian Wasserstein Distance (GWD Loss)</strong> ซึ่งคำนวณระยะห่างของการกระจายตัวทางสถิติ ทำให้การเรียนรู้ราบรื่น 100%
            </p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <h4 className="font-bold text-teal-600 dark:text-teal-300 text-sm">การเชื่อมโยงพิกัดสู่ Robot Tool Flange:</h4>
            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
              เมื่อกล้องอ่านได้มุม &theta; = 42.5&deg; ข้อมูลจะถูกแปลงผ่าน Hand-Eye Calibration Matrix T<sub>cam</sub><sup>base</sup> 
              ส่งพิกัด (X, Y, Z, Roll, Pitch, Yaw) ตรงเข้า Teach Pendant แขนกลจะหมุนหน้าแปลนข้อมือ (แกน 6) มารอที่มุม 42.5&deg; 
              ก่อนที่หัวดูดจะลงแตะชิ้นงาน ลดเวลาปรับองศาหน้างานลงได้ 0.8 วินาทีต่อชิ้น
            </p>
          </div>
        </div>

        {/* Master OBB Variable Breakdown Table */}
        <div className={`p-4 rounded-xl border space-y-3 mt-3 ${
          isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <FiInfo className="w-4 h-4 text-amber-500" />
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
              ตารางแจกแจงที่มาและหน่วยของพารามิเตอร์ Oriented Bounding Box (OBB 5-Parameters)
            </h4>
          </div>
          <div className="overflow-x-auto pb-1 scrollbar-thin">
            <table className="w-full min-w-[620px] text-left text-xs border-collapse">
              <thead className={`font-mono text-[10px] uppercase border-b ${
                isDark ? 'text-slate-400 border-slate-800 bg-slate-900/60' : 'text-slate-600 border-slate-200 bg-slate-100'
              }`}>
                <tr>
                  <th className="py-2 px-3 w-[16%]">พารามิเตอร์</th>
                  <th className="py-2 px-3 w-[14%]">หน่วย (Unit)</th>
                  <th className="py-2 px-3 w-[35%]">ความหมายเชิงเรขาคณิต</th>
                  <th className="py-2 px-3 w-[35%]">การแปลงสู่หุ่นยนต์ / เครื่องจักร</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-amber-500">x_c, y_c</td>
                  <td className="py-2 px-3 font-mono text-[11px]">พิกเซล (Pixels)</td>
                  <td>จุดกึ่งกลางมวลของวัตถุ (Object Centroid)</td>
                  <td>แปลงเป็นมิลลิเมตร (X_mm, Y_mm) ด้วยกล้องคาลิเบรต ส่งให้แขนกลเล็งพิกัดลงแตะ</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-amber-500">w, h</td>
                  <td className="py-2 px-3 font-mono text-[11px]">พิกเซล (Pixels)</td>
                  <td>ความกว้างและความยาวตามแกนขนานตัวชิ้นงาน</td>
                  <td>ใช้ตรวจสอบขนาด Dimension Tolerance และสั่งกางระยะปากคีบ (Gripper Stroke)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-amber-500">&theta; (Theta)</td>
                  <td className="py-2 px-3 font-mono text-[11px]">องศา (&deg;) / เรเดียน</td>
                  <td>มุมเอียงของแกนยาวชิ้นงานเทียบกับแนวนอน</td>
                  <td>ส่งตรงเข้าแกนที่ 6 ของแขนกล (Wrist Roll Yaw) ให้หมุนมือจับมารอที่มุมนี้ล่วงหน้า</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-teal-500">T_cam^base</td>
                  <td className="py-2 px-3 font-mono text-[11px]">เมทริกซ์ 4 &times; 4</td>
                  <td>เมทริกซ์การแปลงพิกัดกล้องสู่ฐานหุ่นยนต์</td>
                  <td>ได้จากการทำ Hand-Eye Calibration (AX = XB) รับประกันความแม่นยำ &plusmn;0.1 มม.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Simulator 3 Embed */}
      <VisionV2YoloObbSimulator />

      {/* Real Hardware Spotlight: Robot Eye-in-Hand Vision */}
      <IndustrialPhotoCard 
        src="./images/mechanisms/robot_eye_in_hand.jpg"
        fallbackSrc="/images/mechanisms/robot_eye_in_hand.jpg"
        badge="ระบบหุ่นยนต์จริง (Eye-in-Hand)"
        badgeColor="amber"
        title="การติดตั้งกล้อง Eye-in-Hand บนหน้าแปลนข้อมือหุ่นยนต์ (Robot Tool Flange)"
        subtitle="ระบบวิชันนำทางแขนกล 6 แกนสำหรับการหยิบชิ้นงานตามมุม OBB บนสายพาน"
        specs={[
          { label: 'ชนิดการติดตั้ง', value: 'Eye-in-Hand (On Flange)' },
          { label: 'การคาลิเบรต', value: 'Hand-Eye AX = XB Matrix' },
          { label: 'ไฟส่องสว่าง', value: 'Integrated LED Ring Light' },
          { label: 'หัวมือจับ', value: 'Pneumatic Parallel Gripper' }
        ]}
        description="ภาพถ่ายการติดตั้งกล้องแมชชีนวิชันอุตสาหกรรมขนาดกะทัดรัดพร้อมไฟวงแหวนเข้ากับหน้าแปลนแกนที่ 6 ของแขนกลอุตสาหกรรม กล้องจะเคลื่อนที่ไปพร้อมกับหัวกริปเปอร์เพื่อถ่ายภาพชิ้นงานในระยะคงที่ และหมุนปรับองศาตามมุม Theta ที่คำนวณได้จากโมเดล YOLO OBB ก่อนเข้าจับชิ้นงาน"
        checkpoints={[
          'สายสัญญาณกล้องและสายไฟต้องร้อยผ่าน Energy Chain ที่ออกแบบเฉพาะสำหรับแขนกล เพื่อป้องกันสายหักงอจากการหมุนบิด (Torsion Flex)',
          'ทำการ Hand-Eye Calibration ด้วยแผ่นตารางหมากรุก (Checkerboard Target) อย่างน้อย 15 ตำแหน่งมุมองศา เพื่อให้พิกัดกล้องกับพิกัดแขนกลตรงกันต่ำกว่า 0.2 มม.'
        ]}
      />

      {/* Section 4: Factory Case Study */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-amber-600/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm font-black border border-amber-500/40">3</span>
          กรณีศึกษาหน้างาน: การคัดแยกชิ้นงานเชื่อมต่อท่อแอร์ยานยนต์ที่วางซ้อนกัน
        </h2>
        <div className="space-y-3 text-xs">
          <div className={`p-4 rounded-xl border space-y-1.5 ${
            isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span className="text-rose-500 flex items-center gap-1.5"><FiAlertTriangle /> ปัญหาหน้างานเดิม: แขนกลหยิบชิ้นงานท่ออลูมิเนียมพลาด 12% บนสายพาน</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 border border-rose-500/30">High Impact</span>
            </div>
            <p><strong>การวิเคราะห์ปัญหา:</strong> ท่ออลูมิเนียมรูปตัว L วางกระจายตัวในแนวเอียง กล้องเดิมใช้โมเดล YOLOv5 AABB กล่องสี่เหลี่ยมแนวดิ่งมีพื้นที่ว่างเกินไป และเมื่อท่อสองชิ้นวางไขว้กัน กล่องจะซ้อนทับกันเกิน 50% ทำให้ระบบลบพิกัดทิ้ง แขนกลจึงมองไม่เห็นชิ้นงาน</p>
            <p className="text-emerald-600 dark:text-emerald-400"><strong>ผลลัพธ์หลังติดตั้ง YOLO OBB:</strong> ตีกรอบแนบสนิทตามแนวท่อตัว L ได้อย่างสมบูรณ์แบบ แยกแยะชิ้นที่ทับกันได้ 100% พร้อมส่งมุมเอียงให้หัว Gripper หมุนจับพอดี เพิ่มอัตราความสำเร็จในการหยิบจาก 88% สู่ 99.8%</p>
          </div>
        </div>
      </section>

      {/* Section 5: Annotation SOP Checklist */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-amber-600/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm font-black border border-amber-500/40">4</span>
          ข้อกำหนดมาตรฐานการติดแท็กข้อมูล OBB (Annotation Guidelines SOP)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {[
            { title: '1. First Point Convention', desc: 'กำหนดจุดคลิกแรกให้เป็นส่วนหัวของชิ้นงานเสมอ เพื่อให้โมเดลเรียนรู้ทิศทางของหัว-ท้ายชิ้นงานได้อย่างถูกต้อง' },
            { title: '2. Tight Bounding Fit', desc: 'ขอบของกล่องต้องสัมผัสกับขอบนอกสุดของชิ้นงานพอดี โดยมีช่องว่างเหลือไม่เกิน 2 พิกเซล' },
            { title: '3. Occlusion Flagging', desc: 'ชิ้นงานที่ถูกชิ้นอื่นทับเกิน 70% ให้ติดแท็กเป็น Is_Occluded หรือตัดออกจากการเป็นเป้าหมายในการหยิบ' },
            { title: '4. Format Export Verification', desc: 'ส่งออกไฟล์ Label ในรูปแบบ DOTA Format หรือ YOLOv8-OBB Format (class x1 y1 x2 y2 x3 y3 x4 y4)' }
          ].map((item, idx) => (
            <div key={idx} className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <FiCheckCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
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
/* MODULE 4: UNSUPERVISED DEFECT DETECTION (PATCHCORE & ANOMALIB)            */
/* ========================================================================= */
export function MachineVisionV2Mod4() {
  const { isDark } = useTheme();
  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn">
      {/* Module Header Banner */}
      <div className={`p-6 md:p-8 rounded-2xl border shadow-xl relative overflow-hidden transition-all ${
        isDark 
          ? 'bg-gradient-to-r from-rose-950/80 via-slate-900 to-red-950/70 border-rose-500/30' 
          : 'bg-gradient-to-r from-rose-50 via-white to-red-50 border-rose-300 shadow-rose-500/5'
      }`}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-300 text-xs font-bold mb-3 border border-rose-500/30">
          <FiAlertTriangle className="w-4 h-4" /> โมดูลที่ 4 (Module 4 of 7 - Advanced Masterclass)
        </div>
        <h1 className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          การตรวจจับของเสียแบบไม่ต้องใช้ภาพ NG (Unsupervised Anomaly Detection: PatchCore &amp; Anomalib)
        </h1>
        <p className={`text-sm md:text-base leading-relaxed w-full ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          แก้ปัญหาคลาสสิกของโรงงานอุตสาหกรรม: การขาดแคลนข้อมูลภาพของเสียในสายการผลิตจริง ด้วยอัลกอริทึม Unsupervised Anomaly Detection 
          การเรียนรู้เฉพาะโครงสร้างชิ้นงานดี (Normal OK Only), การสร้าง Memory Bank ด้วย Coreset Subsampling, 
          และการตรวจจับข้อบกพร่องที่ไม่เคยพบมาก่อน (Zero-Shot Anomaly Detection) ได้อย่างสมบูรณ์แบบ
        </p>
      </div>

      {/* Section 1: The Defect Data Dilemma */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-rose-600/30 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm font-black border border-rose-500/40">1</span>
          ความจริงในโรงงาน: ทำไม Supervised Learning ถึงล้มเหลวในงาน QC จริง?
        </h2>
        <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          ในตำราวิชาการ AI มักสอนให้เก็บภาพ OK 1,000 ภาพ และภาพ NG 1,000 ภาพมาเทรน แต่ในโรงงานจริงที่มีอัตราผลผลิต (Yield) สูงถึง 99.8% 
          การจะรอเก็บภาพของเสียให้ครบทุกรูปแบบต้องใช้เวลานาน 6-12 เดือน และเมื่อมีของเสียรูปแบบใหม่เกิดขึ้น โมเดล Supervised จะปล่อยหลุดทันที:
        </p>

        <div className="overflow-x-auto pb-2 scrollbar-thin rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[680px] text-left text-xs border-collapse">
            <thead className={`font-semibold uppercase text-[11px] border-b ${
              isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              <tr>
                <th className="py-3 px-4 w-[24%]">มิติการเปรียบเทียบ</th>
                <th className="py-3 px-4 w-[38%] text-rose-600 dark:text-rose-300">Supervised AI (YOLO / Mask R-CNN)</th>
                <th className="py-3 px-4 w-[38%] text-emerald-600 dark:text-emerald-400 font-bold">Unsupervised Anomaly (PatchCore)</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-800'}`}>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">ข้อมูลที่ต้องใช้ในการเทรน (Training Data)</td>
                <td className="py-3 px-4 text-rose-500">ต้องมีทั้งภาพ OK และภาพ NG นับร้อยนับพันภาพ</td>
                <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">ใช้เฉพาะภาพชิ้นงานดี (OK) เพียง 30 - 80 ภาพ</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">การตรวจจับของเสียรูปแบบใหม่ (Unseen Defects)</td>
                <td className="py-3 px-4 text-rose-500 font-semibold">มองไม่เห็น 100% หลุดรอดไปหาลูกค้าทันที</td>
                <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">ตรวจจับได้ทันที เพราะไม่ตรงกับโมเดลชิ้นงานปกติ</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">ระยะเวลาในการนำระบบขึ้นใช้งาน (Deployment Time)</td>
                <td className="py-3 px-4 text-rose-500">3 - 6 เดือน (ต้องรอเก็บภาพของเสียและติดแท็ก)</td>
                <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">1 วัน (ถ่ายรูปชิ้นงานดีจากไลน์ผลิต 1 ชั่วโมง รันได้เลย)</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">เอาต์พุตผลการตัดสิน (Decision Output)</td>
                <td className="py-3 px-4">ชื่อคลาสของเสีย และกรอบสี่เหลี่ยม Bounding Box</td>
                <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">Pixel-Level Heatmap ระบุพิกัดและขนาดรอยละเอียด</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: PatchCore Mathematical Architecture */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-rose-600/30 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm font-black border border-rose-500/40">2</span>
          คณิตศาสตร์และสถาปัตยกรรมระดับลึกของ PatchCore
        </h2>
        <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          PatchCore ทำงานโดยการสกัดเวกเตอร์ลักษณะเด่นระดับย่อย (Neighborhood-Aware Patch-Level Features) จากเครือข่าย WideResNet-50 
          แล้วบีบอัดฐานข้อมูลด้วยอัลกorิทึม <strong>Coreset Subsampling</strong>:
        </p>

        <div className={`p-4 rounded-xl border font-mono text-xs space-y-2 ${
          isDark ? 'bg-slate-950 border-slate-800 text-rose-300' : 'bg-slate-50 border-slate-200 text-rose-800'
        }`}>
          <div className="font-bold text-sm text-slate-800 dark:text-white">สมการคำนวณ Anomaly Score:</div>
          <div>s(x<sub>i</sub>) = min<sub>m &isin; M<sub>C</sub></sub> || &phi;(x<sub>i</sub>) - m ||<sub>2</sub></div>
          <div>S<sub>image</sub> = max<sub>i</sub> s(x<sub>i</sub>)</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
            โดย &phi;(x<sub>i</sub>) คือเวกเตอร์แพทช์ในรูปใหม่, M<sub>C</sub> คือ Coreset Memory Bank ของชิ้นงานดี, หากระยะห่างแบบยุคลิดเกินค่า Threshold ระบบจะตัดสินเป็น NG ทันที
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <h4 className="font-bold text-rose-600 dark:text-rose-300 text-sm">Coreset Reduction Algorithm:</h4>
            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
              หากเก็บเวกเตอร์ทุกจุดของภาพ 50 ภาพ จะได้ข้อมูลมากกว่า 5,000,000 เวกเตอร์ ซึ่งทำให้การค้นหาช้าเกินไปในไลน์ผลิต 
              PatchCore ใช้วิธี <strong>Minimax Facility Location</strong> สุ่มตัวอย่างจุดตัวแทนที่ครอบคลุมพื้นที่ทางคณิตศาสตร์สูงสุด 
              ลดขนาดข้อมูลลงเหลือเพียง <strong>1 - 10%</strong> (เหลือเพียง 50,000 เวกเตอร์) ทำให้การสแกนระยะทางเสร็จสิ้นภายใน <strong>6 มิลลิวินาที</strong>
            </p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <h4 className="font-bold text-teal-600 dark:text-teal-300 text-sm">การผสาน Intel OpenVINO Anomalib:</h4>
            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
              ในสภาพแวดล้อมอุตสาหกรรม ซอฟต์แวร์ <strong>Anomalib</strong> จัดเตรียม Pipeline มาตรฐาน 
              เชื่อมต่อกับกล้อง GigE Vision และประมวลผลผ่าน OpenVINO / TensorRT พร้อมส่งออก Anomaly Heatmap ระดับพิกเซล 
              บันทึกภาพของเสียลง NAS และแจ้งพิกัดข้อบกพร่องให้ระบบ MES ทันที
            </p>
          </div>
        </div>

        {/* Master PatchCore Variable Breakdown Table */}
        <div className={`p-4 rounded-xl border space-y-3 mt-3 ${
          isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <FiInfo className="w-4 h-4 text-rose-500" />
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
              ตารางแจกแจงที่มาและหน่วยของสมการ PatchCore Anomaly Detection
            </h4>
          </div>
          <div className="overflow-x-auto pb-1 scrollbar-thin">
            <table className="w-full min-w-[620px] text-left text-xs border-collapse">
              <thead className={`font-mono text-[10px] uppercase border-b ${
                isDark ? 'text-slate-400 border-slate-800 bg-slate-900/60' : 'text-slate-600 border-slate-200 bg-slate-100'
              }`}>
                <tr>
                  <th className="py-2 px-3 w-[16%]">สัญลักษณ์</th>
                  <th className="py-2 px-3 w-[16%]">หน่วย (Unit)</th>
                  <th className="py-2 px-3 w-[34%]">ความหมายทางอัลกอริทึม</th>
                  <th className="py-2 px-3 w-[34%]">ที่มาและการแปลผลในโรงงาน</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-rose-400">&phi;(x_i)</td>
                  <td className="py-2 px-3 font-mono text-[11px]">เวกเตอร์ 1024 มิติ (1024-D)</td>
                  <td>เวกเตอร์ลักษณะเด่นของแพทช์ภาพตำแหน่ง i</td>
                  <td>สกัดจาก Intermediate Layers 2 &amp; 3 ของเครือข่าย WideResNet-50</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-rose-400">M_C</td>
                  <td className="py-2 px-3 font-mono text-[11px]">คลังเวกเตอร์ (Memory Bank)</td>
                  <td>ฐานข้อมูลเวกเตอร์ชิ้นงานดีที่ผ่านการคัดสรร Coreset</td>
                  <td>ใช้ภาพชิ้นงานดี (OK) 30-50 ภาพ แล้วบีบอัดเหลือ 1-10% ด้วย Minimax Facility Location</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-rose-400">|| &phi;(x_i) - m ||_2</td>
                  <td className="py-2 px-3 font-mono text-[11px]">ระยะยุคลิด L2 Norm</td>
                  <td>ระยะห่างระหว่างจุดภาพทดสอบกับชิ้นงานดีที่ใกล้ที่สุด</td>
                  <td>คำนวณระยะห่าง: &radic;(&sum; (&phi;_k - m_k)&sup2;) ยิ่งห่างมาก ยิ่งมีโอกาสเป็นรอยตำหนิ</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-rose-400">s(x_i) / S_image</td>
                  <td className="py-2 px-3 font-mono text-[11px]">คะแนนความผิดปกติ (0.00 - 1.00)</td>
                  <td>Anomaly Score ระดับพิกเซล และคะแนนรวมสูงสุดของภาพ</td>
                  <td>สร้างเป็นแถบสี Heatmap (แดง/เหลือง) บนจอควบคุม หากเกิน 0.5 ตีเป็น NG ส่งเตะทิ้ง</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Simulator 4 Embed */}
      <VisionV2PatchCoreAnomalySimulator />

      {/* Real Industrial Defect & AI Heatmap Comparison */}
      <PhotoComparisonPair 
        title="การเปรียบเทียบหน้างานจริง: ชิ้นงานโลหะมีตำหนิ vs การสร้าง Anomaly Heatmap ด้วย PatchCore"
        badge="ผลการตรวจสอบระดับพิกเซล (Real Pixel-Level Heatmap)"
        left={{
          title: "1. ภาพถ่ายชิ้นงานโลหะจริงที่มีรอยขูดขีด (Raw Surface Scratch Flaw)",
          badge: "RAW DEFECT IMAGE",
          badgeColor: "amber",
          src: "./images/defects/metal_surface_scratch.jpg",
          fallbackSrc: "/images/defects/metal_surface_scratch.jpg",
          specs: [
            { label: 'ชนิดวัสดุ', value: 'Brushed Aluminum' },
            { label: 'ลักษณะตำหนิ', value: 'Hairline Scratch & Gouge' },
            { label: 'ความกว้างรอย', value: '0.08 mm (80 ไมครอน)' },
            { label: 'สภาพแสง', value: 'Low-Angle Darkfield' }
          ],
          desc: "ภาพถ่ายมาโครความละเอียดสูงของชิ้นงานโลหะอะลูมิเนียม CNC จริง มีรอยขูดขีดขนาดเล็กระดับ 80 ไมครอน ซึ่งหากมองด้วยตาเปล่าในไลน์ผลิตที่มีความเร็ว 60 ชิ้น/นาที จะมีโอกาสหลุดรอดสูงถึง 15-20%"
        }}
        right={{
          title: "2. แผนภาพความผิดปกติของ AI (PatchCore Anomaly Heatmap)",
          badge: "AI ANOMALY HEATMAP",
          badgeColor: "rose",
          src: "./images/defects/patchcore_defect_heatmap.jpg",
          fallbackSrc: "/images/defects/patchcore_defect_heatmap.jpg",
          specs: [
            { label: 'อัลกอริทึม', value: 'PatchCore (WideResNet50)' },
            { label: 'Anomaly Score', value: '0.94 / Threshold 0.65' },
            { label: 'ความเชื่อมั่น', value: '99.8% Defect Confidence' },
            { label: 'เวลาประมวลผล', value: '5.8 ms บน TensorRT INT8' }
          ],
          desc: "เอาต์พุต Heatmap จากโมเดล PatchCore จุดที่มีเวกเตอร์ผิดแปลกไปจากฐานข้อมูล Coreset ของชิ้นงานดีจะเรืองแสงสีแดง-เหลืองสว่างจ้า ระบุพิกัดจุดบกพร่องและขนาดความยาวของรอยขูดขีดอย่างแม่นยำ พร้อมส่งคำสั่ง Reject ทันที"
        }}
        conclusion="PatchCore ไม่จำเป็นต้องเคยเห็นภาพของเสียมาก่อนในการเทรน เพียงแค่สแกนพบว่าลักษณะพื้นผิวบริเวณรอยข่วนนี้มีเวกเตอร์ระยะห่างยุคลิดเกินเกณฑ์ Memory Bank ระบบก็สามารถตีกรอบตัดสินเป็น NG ได้ 100% โดยไม่มีข้อผิดพลาด"
      />

      {/* Additional Real Industrial Defect Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <IndustrialPhotoCard 
          src="./images/defects/thread_burr_defect.jpg"
          fallbackSrc="/images/defects/thread_burr_defect.jpg"
          badge="ตัวอย่างของเสียจริง (Defect Sample)"
          badgeColor="rose"
          title="เสี้ยนเกลียวโลหะและเกลียวหวาน (Metallic Thread Burr & Chipped Ridge)"
          subtitle="ข้อบกพร่องวิกฤตในงานกลึงเกลียวและสลักภัณฑ์ยานยนต์"
          specs={[
            { label: 'ชนิดชิ้นงาน', value: 'M8 Precision Steel Bolt' },
            { label: 'ชนิดตำหนิ', value: 'Jagged Burr & Ridge Damage' },
            { label: 'ผลกระทบ', value: 'ขันติด ขันปีนเกลียวในสายประกอบ' },
            { label: 'ความสำคัญ', value: 'IATF 16949 Critical Quality' }
          ]}
          description="ภาพถ่ายมาโครของเกลียวน็อตเหล็กกล้าที่เกิดเสี้ยนโลหะ (Burr) จากคมมีดกลึงที่เริ่มทื่อ หากส่งชิ้นงานนี้ไปยังไลน์ประกอบรถยนต์ น็อตจะขันไม่เข้าหรือปีนเกลียว ทำให้ไลน์หยุดชะงัก PatchCore สามารถตรวจจับความผิดปกติของร่องเกลียวได้อย่างแม่นยำ"
          checkpoints={[
            'ใช้แสงไฟ Backlight หรือไฟด้านข้างเพื่อสร้างเงาคมชัดของฟันเกลียว',
            'ตรวจนับระยะพิตช์ (Pitch Distance) และความสูงของยอดเกลียวเทียบกับแบบทางวิศวกรรม'
          ]}
        />

        <IndustrialPhotoCard 
          src="./images/defects/plastic_defect_void.jpg"
          fallbackSrc="/images/defects/plastic_defect_void.jpg"
          badge="ตัวอย่างของเสียจริง (Defect Sample)"
          badgeColor="amber"
          title="รอยยุบ ฟองอากาศ และรูพรุนในงานฉีดพลาสติก (Plastic Porosity & Voids)"
          subtitle="ข้อบกพร่องจากการยุบตัวของเม็ดพลาสติกและอุณหภูมิแม่พิมพ์ไม่สม่ำเสมอ"
          specs={[
            { label: 'กระบวนการ', value: 'Plastic Injection Molding' },
            { label: 'ชนิดตำหนิ', value: 'Surface Porosity & Sink Mark' },
            { label: 'สาเหตุ', value: 'แรงดัน Holding Pressure ไม่พอ' },
            { label: 'การคัดแยก', value: 'วัดขนาดพื้นที่รูพรุนรวม (Area)' }
          ]}
          description="ภาพถ่ายจริงของชิ้นงานพลาสติกฉีดขึ้นรูปที่เกิดรูพรุนและรอยยุบตัว (Sink Marks) เกิดจากพลาสติกภายในเย็นตัวช้ากว่าผิวนอก ดึงผิวหน้าให้ยุบตัวลง โมเดล Anomaly Detection จะตรวจจับการกระจายตัวของแสงที่ไม่สม่ำเสมอและส่งสัญญาณเตือนปรับอุณหภูมิแม่พิมพ์ทันที"
          checkpoints={[
            'จัดมุมแสงไฟเฉียงเพื่อสร้างเงาในหลุมรอยยุบ ทำให้มองเห็นความลึกชัดเจน',
            'ตั้งค่า Threshold พื้นที่รูพรุนไม่ให้เกินเกณฑ์มาตรฐานชิ้นส่วนภายนอก (Class A Surface)'
          ]}
        />
      </div>

      {/* Section 4: Factory Case Study */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-rose-600/30 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm font-black border border-rose-500/40">3</span>
          กรณีศึกษาหน้างาน: การตรวจจับข้อบกพร่องชิ้นส่วนฉีดพลาสติกขึ้นรูป (Plastic Injection)
        </h2>
        <div className="space-y-3 text-xs">
          <div className={`p-4 rounded-xl border space-y-1.5 ${
            isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span className="text-rose-500 flex items-center gap-1.5"><FiAlertTriangle /> ปัญหา: ของเสียมีหลากหลายรูปแบบ ทั้งรอยยุบ (Sink Marks), ครีบ (Flash), และฟองอากาศ</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 border border-rose-500/30">Complex Defect Types</span>
            </div>
            <p><strong>การแก้ปัญหาด้วย PatchCore:</strong> ถ่ายภาพชิ้นงานพลาสติกที่สมบูรณ์ 60 ชิ้น ใช้เวลาเทรนโมเดล 3.5 นาที เมื่อนำขึ้นตรวจจับหน้างานจริง ระบบสามารถจับได้ทั้งรอยยุบที่ไม่เคยพบ รอยไหม้จากฮีตเตอร์ และเม็ดพลาสติกไม่ละลาย ตรวจจับของเสียได้ 100% โดยไม่มีภาพของเสียหลุดไปถึงลูกค้า</p>
          </div>
        </div>
      </section>

      {/* Section 5: Threshold Balancing SOP */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-rose-600/30 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm font-black border border-rose-500/40">4</span>
          ขั้นตอนการปรับเกณฑ์ตัดสิน (Threshold Tuning &amp; F1-Score Optimization SOP)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {[
            { title: '1. Validation Set Collection', desc: 'รวบรวมชิ้นงานทดสอบ OK 30 ชิ้น และของเสียที่มีรอยตำหนิเล็กที่สุด (Boundary NG) 10 ชิ้น' },
            { title: '2. ROC-AUC Curve Evaluation', desc: 'พล็อตกราฟ Receiver Operating Characteristic เลือกระดับความไวที่ให้อัตรา False Positive Rate &lt; 0.5%' },
            { title: '3. F1-Score Peak Selection', desc: 'เลือกจุด Threshold ที่ค่า F1-Score สูงสุด เพื่อรักษาสมดุลระหว่างไม่เตะของดีทิ้ง และไม่ปล่อยของเสียหลุด' },
            { title: '4. Dynamic Threshold Guardband', desc: 'เผื่อระยะปลอดภัย (Safety Margin) ต่ำกว่าจุดวิกฤต 5% สำหรับชิ้นงานที่เกี่ยวข้องกับความปลอดภัยยานยนต์' }
          ].map((item, idx) => (
            <div key={idx} className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <FiCheckCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
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
/* MODULE 5: VISION TRANSFORMERS (ViT) & SEGMENT ANYTHING (SAM 2)            */
/* ========================================================================= */
export function MachineVisionV2Mod5() {
  const { isDark } = useTheme();
  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn">
      {/* Module Header Banner */}
      <div className={`p-6 md:p-8 rounded-2xl border shadow-xl relative overflow-hidden transition-all ${
        isDark 
          ? 'bg-gradient-to-r from-cyan-950/80 via-slate-900 to-teal-950/70 border-cyan-500/30' 
          : 'bg-gradient-to-r from-cyan-50 via-white to-teal-50 border-cyan-300 shadow-cyan-500/5'
      }`}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 text-xs font-bold mb-3 border border-cyan-500/30">
          <FiLayers className="w-4 h-4" /> โมดูลที่ 5 (Module 5 of 7 - Advanced Masterclass)
        </div>
        <h1 className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Vision Transformers (ViT) &amp; Segment Anything Model (SAM 2) ในงานอุตสาหกรรม
        </h1>
        <p className={`text-sm md:text-base leading-relaxed w-full ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          การเปลี่ยนผ่านครั้งประวัติศาสตร์ของวงการคอมพิวเตอร์วิทัศน์: จากเคอร์เนลคอนโวลูชันขนาดเล็ก (CNNs) สู่กลไกการทำความเข้าใจภาพแบบองค์รวม (Global Self-Attention), 
          การนำโมเดลรากฐาน (Foundation Models) เช่น Meta SAM 2 มาสร้างหน้ากากแบ่งส่วนชิ้นงานระดับพิกเซล, 
          และการกลั่นความรู้ (Knowledge Distillation) บีบอัดลง Edge NPU ความเร็วสูง
        </p>
      </div>

      {/* Section 1: CNN vs ViT Comparison */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-cyan-600/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-sm font-black border border-cyan-500/40">1</span>
          CNNs vs. Vision Transformers (ViT): สถาปัตยกรรมและข้อแตกต่างเชิงลึก
        </h2>
        <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          สถาปัตยกรรม CNN ใช้เคอร์เนลเลื่อนผ่านทีละจุด (Local Receptive Field) ทำให้มองเห็นเฉพาะบริเวณแคบๆ 
          ขณะที่ Vision Transformer (ViT) แบ่งภาพออกเป็นแพทช์ขนาด 16 &times; 16 พิกเซล และคำนวณความสัมพันธ์ระหว่างทุกจุดในภาพพร้อมกัน:
        </p>

        <div className="overflow-x-auto pb-2 scrollbar-thin rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[680px] text-left text-xs border-collapse">
            <thead className={`font-semibold uppercase text-[11px] border-b ${
              isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              <tr>
                <th className="py-3 px-4 w-[24%]">คุณลักษณะ (Attribute)</th>
                <th className="py-3 px-4 w-[38%] text-slate-600 dark:text-slate-400">CNNs (ResNet / ConvNeXt)</th>
                <th className="py-3 px-4 w-[38%] text-cyan-600 dark:text-cyan-400 font-bold">Vision Transformers (ViT / Swin)</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-800'}`}>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">ขอบเขตการรับรู้ (Receptive Field)</td>
                <td className="py-3 px-4">Local (เริ่มต้นที่ 3x3 หรือ 5x5 พิกเซล)</td>
                <td className="py-3 px-4 font-bold text-cyan-600 dark:text-cyan-400">Global ตั้งแต่เลเยอร์แรก (เข้าใจภาพทั้งภาพ)</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">ความทนทานต่อการบดบัง (Occlusion Robustness)</td>
                <td className="py-3 px-4 text-rose-500">ต่ำ หากจุดเด่นถูกบังจะตรวจจับชิ้นงานไม่ติด</td>
                <td className="py-3 px-4 font-bold text-cyan-600 dark:text-cyan-400">สูงมาก อนุมานชิ้นส่วนที่เหลือจากบริบทโดยรวมได้</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">ความไวต่อการหมุนและการเปลี่ยนมุมมอง</td>
                <td className="py-3 px-4">ต้องการ Data Augmentation หนักมาก</td>
                <td className="py-3 px-4 font-bold text-cyan-600 dark:text-cyan-400">เข้าใจความสัมพันธ์ทางเรขาคณิต (Spatial Topology)</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold">การตรวจงานประกอบชิ้นส่วนซับซ้อน (Assembly Check)</td>
                <td className="py-3 px-4">เช็คได้เฉพาะจุด ไม่สามารถยืนยันความสัมพันธ์รวม</td>
                <td className="py-3 px-4 font-bold text-cyan-600 dark:text-cyan-400">ดีเยี่ยมสำหรับชุดสายไฟ แผงวงจร PCB และห้องเครื่องยนต์</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Meta SAM 2 Mechanics */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-cyan-600/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-sm font-black border border-cyan-500/40">2</span>
          Meta SAM 2 (Segment Anything 2) ในสายการผลิตอุตสาหกรรม
        </h2>
        <div className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          <p>
            โมเดลรากฐาน (Foundation Models) เช่น <strong>Meta SAM 2</strong> ได้รับการเทรนด้วยภาพและวิดีโอมากกว่า 1 พันล้านชิ้น 
            ทำให้สามารถสร้างหน้ากากแบ่งส่วนชิ้นงาน (Instance Segmentation) แบบ Zero-Shot ได้ทันทีโดยแทบไม่ต้องเทรนใหม่:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border space-y-2 ${
              isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <h4 className="font-bold text-cyan-600 dark:text-cyan-400 text-sm">1. Point / Box Prompting</h4>
              <p>ผู้ควบคุมเพียงคลิกจุดบนหน้าจอ 1 จุด หรือวาง Bounding Box ระบบจะวาดขอบเขตชิ้นงานระดับ Sub-pixel Precision ภายใน 10 ms</p>
            </div>
            <div className={`p-4 rounded-xl border space-y-2 ${
              isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <h4 className="font-bold text-teal-600 dark:text-teal-400 text-sm">2. Video Memory Tracking</h4>
              <p>SAM 2 มีหน่วยความจำ Spatial-Temporal Memory ติดตามชิ้นงานที่กำลังเคลื่อนที่บนสายพานต่อเนื่อง แม้ชิ้นงานจะหมุนหรือถูกบังบางส่วน</p>
            </div>
            <div className={`p-4 rounded-xl border space-y-2 ${
              isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <h4 className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">3. Edge Knowledge Distillation</h4>
              <p>บีบอัดโมเดลใหญ่สู่ MobileSAM / EdgeSAM นำมารันบนการ์ด NVIDIA Jetson Orin ด้วยความเร็วมากกว่า 45 FPS แบบ Real-Time</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Factory Case Study */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-cyan-600/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-sm font-black border border-cyan-500/40">3</span>
          กรณีศึกษาหน้างาน: การตรวจสอบชุดสายไฟรถยนต์ (Automotive Wire Harness Assembly)
        </h2>
        <div className="space-y-3 text-xs">
          <div className={`p-4 rounded-xl border space-y-1.5 ${
            isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center justify-between font-bold">
              <span className="text-amber-500 flex items-center gap-1.5"><FiAlertTriangle /> ปัญหา: สายไฟดัดงอไม่เป็นระเบียบ และมีสายสีเดียวกันหลายเส้นในคอนเน็กเตอร์</span>
            </div>
            <p><strong>การแก้ปัญหาด้วย ViT &amp; SAM:</strong> สถาปัตยกรรม Transformer ติดตามเส้นทางสายไฟตั้งแต่ต้นทางจนถึงปลายทางพินคอนเน็กเตอร์ ตรวจจับการเสียบพินสลับตำแหน่ง (Pin Mismatch) ได้แม่นยำ 100% ป้องกันปัญหารถยนต์ไฟลัดวงจรได้อย่างเบ็ดเสร็จ</p>
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
    <div className="space-y-6 md:space-y-8 animate-fadeIn">
      {/* Module Header Banner */}
      <div className={`p-6 md:p-8 rounded-2xl border shadow-xl relative overflow-hidden transition-all ${
        isDark 
          ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-green-950/70 border-emerald-500/30' 
          : 'bg-gradient-to-r from-emerald-50 via-white to-green-50 border-emerald-300 shadow-emerald-500/5'
      }`}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-xs font-bold mb-3 border border-emerald-500/30">
          <FiCpu className="w-4 h-4" /> โมดูลที่ 6 (Module 6 of 7 - Advanced Masterclass)
        </div>
        <h1 className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          การปรับปรุงประสิทธิภาพโมเดล AI (Model Optimization) &amp; TensorRT INT8
        </h1>
        <p className={`text-sm md:text-base leading-relaxed w-full ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          ขั้นตอนวิศวกรรมการแปลงโมเดลจาก PyTorch สู่ ONNX และคอมไพล์เป็น TensorRT Engine ระดับไบนารี, 
          การบีบอัดค่าน้ำหนักสู่ระบบจำนวนเต็ม 8 บิต (Post-Training Quantization - PTQ) ด้วย KL Divergence Calibrator, 
          การรวมเลเยอร์ (Layer Fusion), และการเขียน C++ CUDA Zero-Copy Runtime สำหรับงานความเร็วสูงระดับไมโครวินาที
        </p>
      </div>

      {/* Section 1: The Inference Bottleneck */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-black border border-emerald-500/40">1</span>
          ทำไมโมเดล PyTorch ทั่วไปจึงห้ามนำมารันบนสายการผลิตจริง?
        </h2>
        <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          เฟรมเวิร์ก PyTorch หรือ TensorFlow ถูกออกแบบมาเพื่อการวิจัยและการเทรนโมเดล (Training Oriented) 
          เมื่อนำมารัน Inference ในตู้คอนโทรลเลอร์โรงงาน จะติดปัญหาคอขวดของ Python Global Interpreter Lock (GIL), 
          การจัดสรรหน่วยความจำแบบไดนามิก และความล่าช้าในการเข้าถึง VRAM:
        </p>

        <div className="overflow-x-auto pb-2 scrollbar-thin rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[680px] text-left text-xs border-collapse">
            <thead className={`font-semibold uppercase text-[11px] border-b ${
              isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              <tr>
                <th className="py-3 px-4 w-[24%]">แพลตฟอร์มรันโมเดล (Runtime Engine)</th>
                <th className="py-3 px-4 w-[25%]">Throughput (FPS)</th>
                <th className="py-3 px-4 w-[25%]">Latency (ต่อ 1 เฟรม)</th>
                <th className="py-3 px-4 w-[26%]">การใช้พลังงาน (Power Usage)</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-800'}`}>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold text-rose-500">1. PyTorch FP32 (Python Runtime)</td>
                <td className="py-3 px-4">22 FPS</td>
                <td className="py-3 px-4 text-rose-500">45.4 ms</td>
                <td className="py-3 px-4">65 วัตต์ (IPC ร้อนสะสมสูง)</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold text-amber-500">2. ONNX Runtime FP16</td>
                <td className="py-3 px-4">68 FPS</td>
                <td className="py-3 px-4">14.7 ms</td>
                <td className="py-3 px-4">35 วัตต์</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">3. TensorRT FP16 (C++ Engine)</td>
                <td className="py-3 px-4 font-bold">145 FPS</td>
                <td className="py-3 px-4 font-bold">6.8 ms</td>
                <td className="py-3 px-4">18 วัตต์</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-black text-emerald-600 dark:text-emerald-400">4. TensorRT INT8 (Zero-Copy DMA)</td>
                <td className="py-3 px-4 font-black text-emerald-600 dark:text-emerald-400">285 FPS</td>
                <td className="py-3 px-4 font-black text-emerald-600 dark:text-emerald-400">3.5 ms (เร็วกว่าเดิม 13 เท่า!)</td>
                <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">12 วัตต์ (Fanless สมบูรณ์แบบ)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Mathematical Formulations of Quantization */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-black border border-emerald-500/40">2</span>
          คณิตศาสตร์การแปลง FP32 เป็น INT8 (Quantization Formulation)
        </h2>
        <div className={`p-4 rounded-xl border font-mono text-xs space-y-2 ${
          isDark ? 'bg-slate-950 border-slate-800 text-emerald-300' : 'bg-slate-50 border-slate-200 text-emerald-800'
        }`}>
          <div className="font-bold text-sm text-slate-800 dark:text-white">สมการการแปลงค่าน้ำหนักเชิงเส้น (Symmetric Linear Quantization):</div>
          <div>q = clip(round(x / S), -128, 127)</div>
          <div>S = max(|x|) / 127</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
            โดย S คือค่าตัวคูณสเกล (Scale Factor), และการตัดค่าส่วนหางใช้ KL Divergence เพื่อรักษาการกระจายตัวของข้อมูล
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <h4 className="font-bold text-emerald-600 dark:text-emerald-300 text-sm">Layer &amp; Tensor Fusion:</h4>
            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
              ในโมเดลปกติ Conv &rarr; BatchNorm &rarr; ReLU เป็น 3 คำสั่งแยกกัน ต้องอ่าน-เขียน VRAM ถึง 3 รอบ 
              TensorRT ทำการหลอมรวม (Kernel Fusion) เป็น 1 CUDA Kernel เดียว รันเสร็จในรีจิสเตอร์ชิปโดยไม่ต้องผ่าน VRAM 
              ลดความหน่วงและลดแบนด์วิดท์ลงได้กว่า 60%
            </p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <h4 className="font-bold text-teal-600 dark:text-teal-300 text-sm">KL Divergence Calibration Cache:</h4>
            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
              วิศวกรนำภาพชิ้นงานจริงจากโรงงาน 100 - 300 ภาพมารันผ่าน Calibrator เพื่อให้ระบบค้นหาจุดตัดไดนามิก (Dynamic Threshold) 
              ที่สูญเสียค่า mAP ความแม่นยำน้อยกว่า 0.3% แต่ได้ความเร็วเพิ่มขึ้น 2-4 เท่าทันที
            </p>
          </div>
        </div>

        {/* Master INT8 Quantization Breakdown Table */}
        <div className={`p-4 rounded-xl border space-y-3 mt-3 ${
          isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <FiInfo className="w-4 h-4 text-emerald-500" />
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
              ตารางแจกแจงที่มาและหน่วยของสมการ TensorRT INT8 Quantization
            </h4>
          </div>
          <div className="overflow-x-auto pb-1 scrollbar-thin">
            <table className="w-full min-w-[620px] text-left text-xs border-collapse">
              <thead className={`font-mono text-[10px] uppercase border-b ${
                isDark ? 'text-slate-400 border-slate-800 bg-slate-900/60' : 'text-slate-600 border-slate-200 bg-slate-100'
              }`}>
                <tr>
                  <th className="py-2 px-3 w-[16%]">สัญลักษณ์</th>
                  <th className="py-2 px-3 w-[16%]">ประเภทข้อมูล / หน่วย</th>
                  <th className="py-2 px-3 w-[34%]">ความหมายทางสถาปัตยกรรม</th>
                  <th className="py-2 px-3 w-[34%]">ที่มาของตัวเลข / ทฤษฎี</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-emerald-400">x</td>
                  <td className="py-2 px-3 font-mono text-[11px]">FP32 (ทศนิยม 32 บิต)</td>
                  <td>ค่าน้ำหนัก (Weights) ดั้งเดิมจากตอนเทรนใน PyTorch</td>
                  <td>จัดเก็บ 4 ไบต์ต่อค่า (กินแรมและแบนด์วิดท์ VRAM มหาศาล)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-emerald-400">q</td>
                  <td className="py-2 px-3 font-mono text-[11px]">INT8 (-128 ถึง +127)</td>
                  <td>ตัวเลขจำนวนเต็ม 8 บิตแบบมีเครื่องหมาย (Signed)</td>
                  <td>มาตรฐาน Two's Complement: 2^8 = 256 ระดับ (ประหยัดแรมลง 4 เท่า เหลือ 1 ไบต์)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-emerald-400">S (Scale)</td>
                  <td className="py-2 px-3 font-mono text-[11px]">อัตราส่วนทศนิยม (Scalar)</td>
                  <td>ตัวคูณสเกลสำหรับแปลงช่วงตัวเลขระหว่าง FP32 กับ INT8</td>
                  <td>S = max(|x|) / 127 เพื่อแมปค่าสูงสุดของเลเยอร์เข้ากับขอบเขต 127</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-teal-400">D_KL(P || Q)</td>
                  <td className="py-2 px-3 font-mono text-[11px]">Relative Entropy (เอนโทรปี)</td>
                  <td>การวัดความสูญเสียข้อมูลระหว่าง FP32 กับ INT8</td>
                  <td>ทฤษฎี Kullback-Leibler เพื่อตัดส่วนหางที่ไม่จำเป็น (Outlier Clipping) รักษาระดับ mAP สูงสุด</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Real Hardware Showcase: NVIDIA Jetson vs Hailo-8 NPU */}
        <div className="pt-2">
          <PhotoComparisonPair 
            title="การเปรียบเทียบฮาร์ดแวร์ Edge AI จริงในตู้ควบคุมโรงงาน: NVIDIA Jetson vs Hailo-8 M.2 NPU"
            badge="ฮาร์ดแวร์ Edge NPU ของจริง (Real Edge AI Hardware)"
            left={{
              title: "1. NVIDIA Jetson Orin Nano Edge AI System",
              badge: "NVIDIA JETSON ORIN",
              badgeColor: "emerald",
              src: "./images/hardware/jetson_orin_ipc.jpg",
              fallbackSrc: "/images/hardware/jetson_orin_ipc.jpg",
              specs: [
                { label: 'พลังประมวลผล', value: '40 TOPS AI Performance' },
                { label: 'สถาปัตยกรรม', value: 'NVIDIA Ampere GPU (1024 Cores)' },
                { label: 'การใช้พลังงาน', value: '7W - 15W Fanless Mode' },
                { label: 'ซอฟต์แวร์', value: 'JetPack 6.0 / TensorRT 8.6' }
              ],
              desc: "ภาพถ่ายบอร์ด NVIDIA Jetson ในกล่องอลูมิเนียมเกรดอุตสาหกรรม รองรับการประมวลผลโมเดล YOLOv8/v11 และ Segment Anything ด้วยความหน่วงต่ำกว่า 5 ms โดยไม่ต้องใช้คอมพิวเตอร์เซิร์ฟเวอร์ขนาดใหญ่ เหมาะสำหรับติดตั้งในตู้ควบคุมไลน์ผลิต"
            }}
            right={{
              title: "2. Hailo-8 M.2 AI Acceleration Module (26 TOPS)",
              badge: "M.2 NPU ACCELERATOR",
              badgeColor: "cyan",
              src: "./images/hardware/hailo_npu.jpg",
              fallbackSrc: "/images/hardware/hailo_npu.jpg",
              specs: [
                { label: 'ฟอร์มแฟกเตอร์', value: 'Standard M.2 2280 Key M' },
                { label: 'พลังประมวลผล', value: '26 TOPS Neural Accelerator' },
                { label: 'ประสิทธิภาพพลังงาน', value: '3 TOPS / Watt (กินไฟ ~2.5W)' },
                { label: 'การติดตั้ง', value: 'เสียบสล็อต M.2 ใน IPC เดิม' }
              ],
              desc: "ภาพถ่ายโมดูลการ์ด Hailo-8 M.2 ซึ่งเป็น Neural Processing Unit (NPU) สถาปัตยกรรม Dataflow Architecture สามารถนำไปเสียบเข้ากับคอมพิวเตอร์อุตสาหกรรม (IPC) ที่มีอยู่เดิมเพื่ออัปเกรดเป็นเครื่องวิเคราะห์ AI ได้ทันทีโดยไม่ต้องเปลี่ยนระบบตู้ไฟ"
            }}
            conclusion="ทั้งสองแพลตฟอร์มช่วยให้โรงงานก้าวข้ามข้อจำกัดของระบบคลาวด์ ประมวลผลแบบ Real-Time ด้วยความหน่วงต่ำคงที่ ไม่มีความเสี่ยงจากระบบเน็ตเวิร์ก และประหยัดค่าไฟฟ้าในโรงงานได้มหาศาล"
          />
        </div>
      </section>

      {/* Section 3: Optimization SOP Checklist */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-black border border-emerald-500/40">3</span>
          ขั้นตอนการคอมไพล์และทดสอบ TensorRT Engine (Compilation SOP)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {[
            { title: '1. ONNX Static Shape Export', desc: 'ล็อกมิติภาพนำเข้าให้คงที่ เช่น 1x3x640x640 เพื่อให้ TensorRT สร้าง Kernel ที่มีประสิทธิภาพสูงสุด' },
            { title: '2. Calibrator Cache Generation', desc: 'สร้างไฟล์ calibration.cache บันทึกค่า Scale Factor เก็บไว้ใช้งาน ป้องกันการคาลิเบรตซ้ำ' },
            { title: '3. Engine Serialization', desc: 'บันทึก Engine เป็นไฟล์ .engine เฉพาะรุ่น GPU (เช่น orin_nano.engine ห้ามนำไปรันข้ามสถาปัตยกรรม)' },
            { title: '4. Accuracy Delta Validation', desc: 'ทดสอบเปรียบเทียบค่า mAP ระหว่าง PyTorch FP32 กับ TensorRT INT8 ผลลัพธ์ต้องคลาดเคลื่อนไม่เกิน 0.5%' }
          ].map((item, idx) => (
            <div key={idx} className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <FiCheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
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
/* MODULE 7: REAL-TIME REJECT, PROFINET & MES INTEGRATION                     */
/* ========================================================================= */
export function MachineVisionV2Mod7() {
  const { isDark } = useTheme();
  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn">
      {/* Module Header Banner */}
      <div className={`p-6 md:p-8 rounded-2xl border shadow-xl relative overflow-hidden transition-all ${
        isDark 
          ? 'bg-gradient-to-r from-rose-950/80 via-slate-900 to-indigo-950/70 border-rose-500/30' 
          : 'bg-gradient-to-r from-rose-50 via-white to-indigo-50 border-rose-300 shadow-rose-500/5'
      }`}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-300 text-xs font-bold mb-3 border border-rose-500/30">
          <FiServer className="w-4 h-4" /> โมดูลที่ 7 (Module 7 of 7 - Advanced Masterclass)
        </div>
        <h1 className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          ระบบขับดันของเสียความเร็วสูง (High-Speed Reject), PROFINET IRT &amp; MES
        </h1>
        <p className={`text-sm md:text-base leading-relaxed w-full ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          การบูรณาการระบบวิชันเข้ากับกลไกทางกายภาพ: การคำนวณติดตามตำแหน่งชิ้นงานด้วย Rotary Encoder &amp; PLC Shift Register, 
          การควบคุมโซลินอยด์วาล์วยิงลมเตะของเสีย (Air Jet Rejector), การสื่อสาร Real-Time Fieldbus ระดับไมโครวินาที (PROFINET IRT / EtherCAT), 
          และการส่งถ่ายสถิติ Defect Pareto Chart เข้าสู่ระบบ MES ตามมาตรฐานอุตสาหกรรมยานยนต์ IATF 16949
        </p>
      </div>

      {/* Section 1: Physical Rejection Mechanics */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-rose-600/30 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm font-black border border-rose-500/40">1</span>
          กลไกการคัดแยกชิ้นงานทางกายภาพ (Physical Rejection Mechanisms)
        </h2>
        <div className="overflow-x-auto pb-2 scrollbar-thin rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full min-w-[680px] text-left text-xs border-collapse">
            <thead className={`font-semibold uppercase text-[11px] border-b ${
              isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              <tr>
                <th className="py-3 px-4 w-[24%]">กลไกคัดแยก (Reject Mechanism)</th>
                <th className="py-3 px-4 w-[25%]">ความเร็วสูงสุด (Speed Capacity)</th>
                <th className="py-3 px-4 w-[25%]">น้ำหนักชิ้นงานที่เหมาะสม</th>
                <th className="py-3 px-4 w-[26%]">ความเสี่ยงและการประยุกต์ใช้งาน</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-800'}`}>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold text-cyan-600 dark:text-cyan-400">1. High-Speed Air Jet (หัวฉีดลมแรงดันสูง)</td>
                <td className="py-3 px-4 font-bold">มากกว่า 600 ชิ้น/นาที</td>
                <td className="py-3 px-4">&lt; 100 กรัม (ชิ้นส่วนเบา)</td>
                <td className="py-3 px-4">ไม่มีชิ้นส่วนกลไกเคลื่อนไหว ไม่เสี่ยงชนกระแทก</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold text-amber-600 dark:text-amber-400">2. Pneumatic Pusher (กระบอกสูบเตะ)</td>
                <td className="py-3 px-4 font-bold">80 - 150 ชิ้น/นาที</td>
                <td className="py-3 px-4">100 กรัม - 5 กิโลกรัม</td>
                <td className="py-3 px-4">ต้องติดยางกันกระแทก ป้องกันชิ้นงานเสียรูป</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold text-teal-600 dark:text-teal-400">3. Diverter Flap Gate (ลิ้นสลับทาง)</td>
                <td className="py-3 px-4 font-bold">120 - 250 ชิ้น/นาที</td>
                <td className="py-3 px-4">100 กรัม - 10 กิโลกรัม</td>
                <td className="py-3 px-4">นุ่มนวลสูงสุด เหมาะกับขวดแก้วหรือกล่องสินค้า</td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                <td className="py-3 px-4 font-bold text-rose-600 dark:text-rose-400">4. Drop Flap Conveyor (ถาดสายพานเปิดทิ้ง)</td>
                <td className="py-3 px-4 font-bold">40 - 80 ชิ้น/นาที</td>
                <td className="py-3 px-4">&gt; 5 กิโลกรัม (ชิ้นงานหนัก)</td>
                <td className="py-3 px-4">เปิดสายพานหย่อนลงถังของเสียด้านล่าง</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Encoder Tracking Mathematics */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-rose-600/30 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm font-black border border-rose-500/40">2</span>
          คณิตศาสตร์การติดตามตำแหน่งด้วย Rotary Encoder &amp; Shift Register
        </h2>
        <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          หากใช้ระบบหน่วงเวลาตามเวลา (Timer-based Delay) เมื่อมอเตอร์สายพานทำงานช้าลงหรือเร็วขึ้น หัวเตะจะยิงลมผิดตำแหน่งทันที 
          ในโรงงานอัจฉริยะจึงต้องใช้ <strong>Encoder Pulses Tracking</strong> ผ่าน Shift Register ใน PLC:
        </p>

        <div className={`p-4 rounded-xl border font-mono text-xs space-y-2 ${
          isDark ? 'bg-slate-950 border-slate-800 text-rose-300' : 'bg-slate-50 border-slate-200 text-rose-800'
        }`}>
          <div className="font-bold text-sm text-slate-800 dark:text-white">สมการคำนวณตำแหน่งพัลส์การเตะ (Reject Trigger Pulse Equation):</div>
          <div>PPM = (Encoder_PPR &times; 4) / (&pi; &times; Wheel_Diameter)</div>
          <div>Target_Pulse = Trigger_Camera_Pulse + (Distance_Reject &times; PPM)</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
            โดย PPM คือ Pulses Per Millimeter, ไม่ว่าสายพานจะหยุด ชะลอ หรือเร่งความเร็ว หัวเตะจะยิงลมที่ตำแหน่งเดิมเสมอ 100%
          </div>
        </div>

        {/* Master Encoder Variable Breakdown Table */}
        <div className={`p-4 rounded-xl border space-y-3 mt-3 ${
          isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <FiInfo className="w-4 h-4 text-rose-500" />
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
              ตารางแจกแจงที่มาและหน่วยของสมการติดตามตำแหน่งด้วยเอ็นโค้เดอร์ (Encoder Tracking Variables)
            </h4>
          </div>
          <div className="overflow-x-auto pb-1 scrollbar-thin">
            <table className="w-full min-w-[620px] text-left text-xs border-collapse">
              <thead className={`font-mono text-[10px] uppercase border-b ${
                isDark ? 'text-slate-400 border-slate-800 bg-slate-900/60' : 'text-slate-600 border-slate-200 bg-slate-100'
              }`}>
                <tr>
                  <th className="py-2 px-3 w-[16%]">ตัวแปร / ตัวเลข</th>
                  <th className="py-2 px-3 w-[16%]">หน่วย (Unit)</th>
                  <th className="py-2 px-3 w-[34%]">ความหมายทางกลและไฟฟ้า</th>
                  <th className="py-2 px-3 w-[34%]">ที่มาของตัวเลขหน้างานจริง</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-rose-400">PPM (Encoder)</td>
                  <td className="py-2 px-3 font-mono text-[11px]">พัลส์/มม. (pulses/mm)</td>
                  <td>ความละเอียดของพัลส์ต่อระยะทางการเคลื่อนที่ 1 มม.</td>
                  <td>คำนวณจาก: (Encoder_PPR &times; 4) / (&pi; &times; Wheel_Diameter)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-rose-400">Encoder_PPR</td>
                  <td className="py-2 px-3 font-mono text-[11px]">พัลส์ต่อรอบ (PPR)</td>
                  <td>ความละเอียดเชิงแสงของแผ่นดิสก์ในตัวเอ็นโค้เดอร์</td>
                  <td>ดูจาก Nameplate ฉลากบนตัว Rotary Encoder เช่น 1,024 หรือ 2,048 PPR</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-rose-400">&times; 4 (ตัวเลข 4)</td>
                  <td className="py-2 px-3 font-mono text-[11px]">ตัวคูณถอดรหัส (เท่า)</td>
                  <td>การนับแบบ Quadrature 4x Decoding ในการ์ดเคาน์เตอร์ PLC</td>
                  <td>นับ 2 ขอบ (ขาขึ้น+ขาลง) ของ Phase A และ 2 ขอบของ Phase B (2 + 2 = 4)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-rose-400">&pi; &times; Wheel_Diameter</td>
                  <td className="py-2 px-3 font-mono text-[11px]">มิลลิเมตร (mm)</td>
                  <td>เส้นรอบวง (Circumference) ของลูกกลิ้งวัดระยะทาง</td>
                  <td>วัดเส้นผ่านศูนย์กลาง (D) ของลูกกลิ้งยางที่แนบกับสายพานด้วยเวอร์เนีย</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono font-bold text-teal-400">Target_Pulse</td>
                  <td className="py-2 px-3 font-mono text-[11px]">จำนวนเต็มพัลส์ (Int32)</td>
                  <td>ค่าเคาน์เตอร์สะสมใน PLC ที่จะส่งสัญญาณยิงลมเตะ</td>
                  <td>เมื่อค่า High-Speed Counter นับถึงค่านี้ PLC จะยิงคำสั่งฮาร์ดแวร์ทันที</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 3: MES Integration Architecture */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-rose-600/30 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm font-black border border-rose-500/40">3</span>
          การเชื่อมโยงระบบวิชันเข้ากับฐานข้อมูล MES และสถิติ Defect Pareto
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h4 className="font-bold text-cyan-600 dark:text-cyan-400 text-sm">Automated Defect Image Storage</h4>
            <p className="leading-relaxed">
              ภาพของเสียความละเอียดสูงพร้อมกรอบสี่เหลี่ยมระบุข้อบกพร่องจะถูกบีบอัดเป็น WebP และบันทึกลง Network Attached Storage (NAS) 
              โดยตั้งชื่อไฟล์ตาม Serial No. และ Work Order เพื่อการสืบย้อนกลับ 10 ปี
            </p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h4 className="font-bold text-amber-600 dark:text-amber-400 text-sm">Real-Time Pareto Analytics</h4>
            <p className="leading-relaxed">
              ข้อมูลรหัสของเสีย (Defect Code เช่น D01: Scratch, D02: Dent, D03: Burr) ถูกส่งตรงเข้าฐานข้อมูล SQL Server 
              แดชบอร์ด MES แสดงผลกราฟ Pareto ทันที ทำให้วิศวกรซ่อมบำรุงรู้ว่าแม่พิมพ์สถานีใดกำลังสึกหรอ
            </p>
          </div>
          <div className={`p-4 rounded-xl border space-y-2 ${
            isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <h4 className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">Consecutive NG Interlock</h4>
            <p className="leading-relaxed">
              หากระบบตรวจพบของเสียชนิดเดียวกัน 3 ชิ้นติดต่อกัน ระบบ MES จะสั่งตัดสัญญาณ Run ของเครื่องจักรทันที (Automatic Line Stop) 
              เพื่อป้องกันการผลิตของเสียซ้ำซากตามหลักการ Jidoka (ออโตเมชันที่ฉลาด)
            </p>
          </div>
        </div>

        {/* Real Hardware Spotlight: Pneumatic Reject Pusher & Air Jet Station */}
        <div className="pt-2">
          <IndustrialPhotoCard 
            src="./images/mechanisms/pneumatic_reject_cylinder.jpg"
            fallbackSrc="/images/mechanisms/pneumatic_reject_cylinder.jpg"
            badge="กลไกหน้างานจริง (Reject Mechanism)"
            badgeColor="rose"
            title="ชุดกระบอกสูบและหัวเป่าลมเตะของเสียความเร็วสูง (High-Speed Pneumatic Ejector)"
            subtitle="กลไกคัดแยกชิ้นงาน NG ลงถังของเสียด้วยความเร็ว 120-250 ชิ้น/นาที"
            specs={[
              { label: 'กลไกคัดแยก', value: 'Double-Acting Pneumatic Cylinder' },
              { label: 'โซลินอยด์วาล์ว', value: 'High-Response 24V Valve (10 ms)' },
              { label: 'เซนเซอร์ยืนยัน', value: 'Through-Beam Sensor ตรวจของตก' },
              { label: 'ความเร็วสายพาน', value: 'รองรับได้ถึง 90 m/min' }
            ]}
            description="ภาพถ่ายสถานีคัดแยกของเสียจริงบนสายพานลำเลียง เมื่อระบบ AI หรือกล้องประมวลผลพบข้อบกพร่อง สัญญาณ Trigger จะถูกหน่วงเวลาตามพัลส์ของ Encoder และสั่งให้โซลินอยด์วาล์วยิงกระบอกสูบลมเตะชิ้นงาน NG ตกลงสู่ถังของเสียสีเหลืองทันที พร้อมเซนเซอร์แสงตรวจเช็คว่าชิ้นงานตกลงถังจริง"
            checkpoints={[
              'ติดตั้งแผ่นยางโพลียูรีเทน (PU Pad) ที่ปลายก้านสูบเพื่อป้องกันรอยกระแทกบุบบนชิ้นงาน',
              'ติดตั้งเซนเซอร์ตรวจจับของเสียเต็มถัง (Bin Full Sensor) หากเต็มต้องส่งสัญญาณเตือนให้พนักงานเปลี่ยนถังทันที'
            ]}
          />
        </div>
      </section>

      {/* Section 4: Validation SOP Checklist */}
      <section className={`p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="w-7 h-7 rounded-lg bg-rose-600/30 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm font-black border border-rose-500/40">4</span>
          ขั้นตอนการส่งมอบระบบและการทดสอบรับรอง (Validation Protocol SOP)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {[
            { title: '1. Golden Sample Challenge Test', desc: 'ปล่อยชิ้นงานตัวอย่างที่มีรอยตำหนิต่ำสุดที่กำหนด 100 รอบ ต้องคัดแยกทิ้งลงถังของเสีย 100/100 รอบ ไร้ข้อผิดพลาด' },
            { title: '2. False Reject Rate Verification', desc: 'ปล่อยชิ้นงานดี 5,000 ชิ้น อัตราการเตะของดีทิ้ง (False Overkill) ต้องต่ำกว่า 0.1% (&lt; 5 ชิ้น)' },
            { title: '3. Reject Bin Level Sensor Check', desc: 'ตรวจสอบเซนเซอร์ตรวจจับของเสียเต็มถัง (Bin Full Sensor) หากเต็มต้องเตือนหยุดสายพาน' },
            { title: '4. IATF 16949 Sign-off Audit', desc: 'บันทึกเอกสาร FMEA, Control Plan, และ Gage R&amp;R Report มอบให้ฝ่ายประกันคุณภาพ QA' }
          ].map((item, idx) => (
            <div key={idx} className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <FiCheckCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
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

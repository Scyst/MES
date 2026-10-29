import React, { useState } from 'react';
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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FiCpu className="w-5 h-5 text-emerald-400" />
            ห้องแล็บประเมินประสิทธิภาพ Edge NPU &amp; TensorRT Quantization
          </h3>
          <p className="text-xs text-slate-400 mt-1">
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
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <FiSliders className="w-4 h-4 text-emerald-400" /> ตั้งค่าการบีบอัดโมเดล
          </h4>

          <div>
            <div className="text-xs text-slate-400 mb-1.5">ระดับความแม่นยำ (Precision Mode):</div>
            <div className="grid grid-cols-3 gap-2">
              {['FP32', 'FP16', 'INT8'].map((p) => (
                <button
                  key={p}
                  onClick={() => setQuantization(p)}
                  className={`py-2 rounded-lg text-xs font-mono font-bold border transition-all ${
                    quantization === p
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">INT8 บีบอัดค่าน้ำหนักเหลือ 8 บิต เร็วขึ้น 2-4 เท่า สูญเสียความแม่นยำ &lt;0.5% mAP</span>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-1.5">ความละเอียดภาพนำเข้า (Input Resolution):</div>
            <div className="grid grid-cols-2 gap-2">
              {[640, 1280].map((r) => (
                <button
                  key={r}
                  onClick={() => setResolution(r)}
                  className={`py-2 rounded-lg text-xs font-mono font-bold border transition-all ${
                    resolution === r
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
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
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Inference Time</div>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{baseLatency} ms</div>
              <div className="text-[10px] text-slate-500 mt-0.5">เวลาต่อ 1 เฟรม</div>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Throughput</div>
              <div className="text-2xl font-black text-cyan-400 font-mono mt-1">{fps} FPS</div>
              <div className="text-[10px] text-slate-500 mt-0.5">เฟรมต่อวินาที</div>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Power Consumption</div>
              <div className="text-2xl font-black text-amber-400 font-mono mt-1">{powerWatts} W</div>
              <div className="text-[10px] text-slate-500 mt-0.5">ความร้อนต่ำ Fanless</div>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Max Line Speed</div>
              <div className="text-2xl font-black text-teal-400 font-mono mt-1">{maxLineSpeed} m/min</div>
              <div className="text-[10px] text-slate-500 mt-0.5">ความเร็วสายพานสูงสุด</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5">
              <FiInfo className="w-4 h-4" /> สรุปผลการทดสอบสถาปัตยกรรม Edge AI Vision
            </div>
            <p className="text-slate-300 leading-relaxed">
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
  const [lightingMode, setLightingMode] = useState('4_WAY_STEREO'); // 'DIFFUSE_WHITE' | '4_WAY_STEREO' | 'POLARIZED'
  const [scratchDepth, setScratchDepth] = useState(15); // microns

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FiEye className="w-5 h-5 text-indigo-400" />
            ห้องแล็บจำลอง 3D Photometric Stereo &amp; Smart Optics
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            ตรวจสอบรอยขีดข่วนระดับไมครอนบนผิวโลหะสะท้อนแสงสูง (Reflective Metallic Parts) ด้วยการยิงแสง 4 ทิศทางแยกมิติความสูงและความเอียง
          </p>
        </div>
        <div className="flex items-center gap-2">
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
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <FiSliders className="w-4 h-4 text-indigo-400" /> ขนาดตำหนิบนผิวงาน
          </h4>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">ความลึกรอยขีดข่วน (Scratch Depth):</span>
              <span className="text-indigo-400 font-mono font-bold">{scratchDepth} µm</span>
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

          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs space-y-1">
            <span className="text-slate-400 font-bold">ชนิดเลนส์ที่ใช้:</span>
            <div className="text-teal-300 font-medium">Liquid Lens (ปรับโฟกัสด้วยแรงดันไฟฟ้า 5ms)</div>
            <p className="text-[11px] text-slate-500">
              ไม่มีชิ้นส่วนกลไกเคลื่อนไหว โฟกัสชิ้นงานต่างระดับความสูงได้ทันทีในไลน์ผลิต
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-xs font-bold text-slate-300 mb-2">ภาพ 2D Gray / Albedo Image</div>
              <div className={`h-28 rounded-lg flex items-center justify-center border font-mono text-xs transition-all ${
                lightingMode === 'DIFFUSE_WHITE'
                  ? 'bg-slate-200 text-slate-800 border-white font-bold'
                  : lightingMode === 'POLARIZED'
                  ? 'bg-slate-700 text-slate-300 border-slate-600'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {lightingMode === 'DIFFUSE_WHITE' && 'แสงสะท้อนจ้า (Glare Blind Spot) มองไม่เห็นรอย!'}
                {lightingMode === 'POLARIZED' && 'ตัดแสงวาบได้ แต่รอยตื้นๆ ยังกลืนไปกับลายขัดผิว'}
                {lightingMode === '4_WAY_STEREO' && 'แยกภาพสีผิวออกจากความขรุขระชัดเจน'}
              </div>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-xs font-bold text-slate-300 mb-2">ภาพ 3D Gradient / Surface Normal Map</div>
              <div className={`h-28 rounded-lg flex items-center justify-center border font-mono text-xs transition-all ${
                lightingMode === '4_WAY_STEREO'
                  ? 'bg-indigo-950/70 border-indigo-500 text-indigo-300 font-bold shadow-lg shadow-indigo-500/10'
                  : 'bg-slate-900 border-slate-800 text-slate-600'
              }`}>
                {lightingMode === '4_WAY_STEREO' ? (
                  <div className="text-center space-y-1">
                    <div className="text-emerald-400 font-bold">ตรวจพบรอยลึก {scratchDepth} µm ชัดเจน 100%!</div>
                    <div className="text-[10px] text-indigo-300">Surface Curvature &amp; Normal Vector Verified</div>
                  </div>
                ) : (
                  'ต้องการแสง 4 ทิศทางเพื่อคำนวณ Normal Map'
                )}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="font-bold text-indigo-300 flex items-center gap-1.5">
              <FiCheckCircle className="w-4 h-4" /> ทำไมโรงงานยุคใหม่จึงต้องใช้ 3D Photometric Stereo?
            </div>
            <p className="text-slate-300 leading-relaxed">
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
  const [boxType, setBoxType] = useState('OBB'); // 'AABB' | 'OBB'
  const [rotationAngle, setRotationAngle] = useState(42); // degrees

  const noiseArea = boxType === 'AABB' ? '48.5%' : '4.2%';
  const graspAccuracy = boxType === 'AABB' ? 'พิกัดกว้างเกินไป (หยิบพลาด)' : 'แม่นยำ 99.8% (พร้อมมุม Roll θ)';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FiTarget className="w-5 h-5 text-amber-400" />
            ห้องแล็บเปรียบเทียบ AABB vs Oriented Bounding Box (OBB - YOLOv11)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            สาธิตความแตกต่างระหว่างการตีกรอบสี่เหลี่ยมแนวดิ่งแบบเดิม (AABB) กับการตีกรอบหมุนตามองศาชิ้นงาน (OBB) สำหรับแขนกลหยิบชิ้นงาน
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBoxType('AABB')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              boxType === 'AABB'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            แบบเดิม: Standard AABB (x, y, w, h)
          </button>
          <button
            onClick={() => setBoxType('OBB')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              boxType === 'OBB'
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            แบบใหม่: YOLO OBB (x, y, w, h, θ)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <FiSliders className="w-4 h-4 text-amber-400" /> องศาการเอียงของชิ้นงาน
          </h4>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">มุมหมุนชิ้นงานบนสายพาน:</span>
              <span className="text-amber-400 font-mono font-bold">{rotationAngle}°</span>
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

          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs space-y-1">
            <span className="text-slate-400 font-bold">โครงสร้างเอาต์พุตโมเดล:</span>
            <div className="font-mono text-cyan-400 text-[11px]">
              {boxType === 'AABB' ? '[cls, x_c, y_c, w, h]' : '[cls, x1, y1, x2, y2, x3, y3, x4, y4, θ]'}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Background Noise Area</div>
              <div className={`text-2xl font-black font-mono mt-1 ${boxType === 'OBB' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {noiseArea}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">พื้นที่พื้นหลังที่หลุดเข้ามาในกรอบ</div>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Grasp Pose for Robot</div>
              <div className="text-xs font-bold text-teal-400 mt-2">{graspAccuracy}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">ส่งต่อให้ Cobot หยิบ</div>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">Overlapping Separation</div>
              <div className={`text-xs font-bold mt-2 ${boxType === 'OBB' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {boxType === 'OBB' ? 'แยกชิ้นงานที่เบียดกันได้' : 'กล่องทับซ้อนกันมั่ว (NMS Error)'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Non-Maximum Suppression</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <FiInfo className="w-4 h-4" /> สถาปัตยกรรม Anchor-Free ใน YOLOv8 / YOLOv11
            </div>
            <p className="text-slate-400 leading-relaxed">
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
  const [defectType, setDefectType] = useState('SCRATCH'); // 'NONE' | 'SCRATCH' | 'THREAD_BURR' | 'STAIN'
  const [threshold, setThreshold] = useState(0.65);

  let anomalyScore = 0.22;
  if (defectType === 'SCRATCH') anomalyScore = 0.88;
  if (defectType === 'THREAD_BURR') anomalyScore = 0.94;
  if (defectType === 'STAIN') anomalyScore = 0.71;

  const isNG = anomalyScore >= threshold;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FiAlertTriangle className="w-5 h-5 text-rose-400" />
            ห้องแล็บ Unsupervised Anomaly Detection (PatchCore / Anomalib)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            การตรวจจับของเสียด้วยโมเดลที่ไม่ต้องใช้ภาพ NG แม้แต่รูปเดียว โดยเรียนรู้เฉพาะลักษณะชิ้นงาน OK ปกติ (Zero-Shot / Few-Shot Anomaly Detection)
          </p>
        </div>
        <div className="flex items-center gap-2">
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
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <FiSliders className="w-4 h-4 text-rose-400" /> พารามิเตอร์เกณฑ์ตัดสิน
          </h4>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">เกณฑ์ตัดสินของเสีย (Threshold):</span>
              <span className="text-rose-400 font-mono font-bold">{threshold.toFixed(2)}</span>
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

          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs space-y-1">
            <div className="text-slate-400">ขนาดฐานข้อมูล Memory Bank:</div>
            <div className="font-bold text-slate-200">50 รูปชิ้นงาน OK (Coreset Subsampling)</div>
            <p className="text-[11px] text-slate-500">
              ไม่ต้องเสียเวลาเก็บรูปของเสีย 1,000 รูป แค่เทรนรูปชิ้นงานดี 50 รูปใช้เวลาเพียง 2 นาที
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`p-4 rounded-xl border text-center transition-all ${
              isNG ? 'bg-rose-500/10 border-rose-500/30' : 'bg-emerald-500/10 border-emerald-500/30'
            }`}>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">MES Quality Decision</div>
              <div className={`text-2xl font-black font-mono mt-1 ${isNG ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isNG ? 'DEFECT DETECTED (NG)' : 'NORMAL PART (PASS)'}
              </div>
              <div className="text-xs mt-1 font-mono">
                Anomaly Score: {anomalyScore.toFixed(2)} / Threshold: {threshold.toFixed(2)}
              </div>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Defect Localization Map</div>
              <div className="text-xs font-bold text-cyan-400 mt-2">
                {defectType === 'NONE' ? 'ผิวเรียบเสมอกันทุกจุด' : `ตรวจพบพิกัดผิดปกติที่บริเวณ ${defectType}`}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Pixel-Level Heatmap Precision</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-300">
            <div className="font-bold text-rose-300 flex items-center gap-1.5">
              <FiCheckCircle className="w-4 h-4" /> ข้อได้เปรียบปฏิวัติวงการ: ทำไม PatchCore ถึงชนะการเทรน AI แบบเดิม?
            </div>
            <p className="text-slate-400 leading-relaxed">
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
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
          <FiCpu className="w-4 h-4" /> บทที่ 1 (Module 1 - 2026 Edition)
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          สถาปัตยกรรม Next-Gen AI Machine Vision ยุคปี 2026 &amp; Edge Computing
        </h1>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
          ศึกษาวิวัฒนาการจากระบบคอมพิวเตอร์วิทัศน์แบบดั้งเดิม (Classical Rule-Based) สู่สถาปัตยกรรม Edge NPU อัจฉริยะ การประมวลผลแบบไร้คลาวด์ (Zero-Cloud Latency) และการออกแบบไปป์ไลน์ระดับ Microsecond
        </p>
      </div>

      <VisionV2EdgeNpuSimulator />

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center text-sm font-black border border-emerald-500/40">1</span>
          3 เสาหลักของการออกแบบระบบ AI Machine Vision สมัยใหม่
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-emerald-300 text-sm">1. Edge NPU First</h3>
            <p className="text-slate-300 leading-relaxed">
              การรันโมเดล AI ในโรงงานต้องทำที่หน้างาน (On-Premises Edge) 100% ด้วยชิป Neural Processing Unit (NPU) อย่าง NVIDIA Jetson Orin หรือ Hailo-8 เพื่อความหน่วงเวลาต่ำกว่า 5ms และป้องกันสายการผลิตหยุดทำงานกรณีอินเทอร์เน็ตหลุด
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-cyan-300 text-sm">2. Zero-Downtime Retraining</h3>
            <p className="text-slate-300 leading-relaxed">
              ระบบวิชันยุคใหม่เชื่อมต่อฐานข้อมูลภาพกับระบบ MLOps สามารถอัปเดตโมเดลเวอร์ชันใหม่แบบ Shadow Deployment (รันเปรียบเทียบเบื้องหลัง) ก่อนสลับใช้งานจริงโดยไม่ต้องหยุดเครื่องจักร
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-amber-300 text-sm">3. Deterministic Fieldbus Integration</h3>
            <p className="text-slate-300 leading-relaxed">
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
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
          <FiEye className="w-4 h-4" /> บทที่ 2 (Module 2 - 2026 Edition)
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          เทคโนโลยีเซนเซอร์ภาพความเร็วสูง, เลนส์ Smart Optics &amp; 3D Photometric Stereo
        </h1>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
          เจาะลึกเทคโนโลยีเซนเซอร์ภาพ Global Shutter CMOS ความเร็วสูง เลนส์ของเหลวปรับโฟกัสอัตโนมัติ (Liquid Lens) และเทคนิค 3D Photometric Stereo เพื่อตรวจสอบผิวสัมผัสระดับไมครอน
        </p>
      </div>

      <VisionV2SmartOptics3DSimulator />

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-sm font-black border border-indigo-500/40">1</span>
          ความก้าวหน้าด้านเลนส์และเซนเซอร์อุตสาหกรรม
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-indigo-300 text-sm">Liquid Lenses (เลนส์ของเหลวควบคุมด้วยไฟฟ้า)</h3>
            <p className="text-slate-300 leading-relaxed">
              ใช้หลักการ Electrowetting ปรับความโค้งของหยดของเหลวด้วยแรงดันไฟฟ้า ทำให้สามารถเปลี่ยนระยะโฟกัสได้ภายใน 5 มิลลิวินาที ทนทานการเปลี่ยนโฟกัสนับร้อยล้านครั้งโดยไม่มีมอเตอร์สึกหรอ เหมาะสำหรับชิ้นงานที่มีหลายระนาบความสูงบนสายพานเดียวกัน
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-teal-300 text-sm">Polarized Image Sensors (เซนเซอร์ฝังโพลารอยด์ในพิกเซล)</h3>
            <p className="text-slate-300 leading-relaxed">
              เซนเซอร์ภาพรุ่นใหม่ เช่น Sony Pregius S ฝังโพลาไรเซอร์ 4 ทิศทาง (0°, 45°, 90°, 135°) ลงในแต่ละพิกเซลบนซิลิคอน ทำให้ได้ข้อมูล Degree of Linear Polarization (DoLP) ในช็อตเดียว สามารถแยกแยะรอยขีดข่วนบนฟิล์มหรือโลหะแวววาวได้โดยแสงไม่ฟุ้ง
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
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
          <FiTarget className="w-4 h-4" /> บทที่ 3 (Module 3 - 2026 Edition)
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Anchor-Free YOLOv8 / YOLOv11 &amp; Oriented Bounding Box (OBB)
        </h1>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
          วิวัฒนาการสถาปัตยกรรม Object Detection สู่ยุค Anchor-Free แยกแยะชิ้นงานที่หมุนเอียงอิสระด้วยกรอบพิกัด 5 ตัวแปร (x, y, w, h, θ) ส่งต่อพิกัดมุม Roll ให้หุ่นยนต์หยิบชิ้นงานได้อย่างแม่นยำ
        </p>
      </div>

      <VisionV2YoloObbSimulator />

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-amber-600/30 text-amber-400 flex items-center justify-center text-sm font-black border border-amber-500/40">1</span>
          การประยุกต์ใช้ YOLO OBB ในสายการผลิต
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-amber-300 text-sm">ชิ้นงานซ้อนทับกัน (Dense Packing)</h3>
            <p className="text-slate-300 leading-relaxed">
              เมื่อชิ้นงานทรงยาววางติดกัน กรอบแนวดิ่งเดิมจะซ้อนทับกันจนคำสั่ง NMS ลบทิ้ง แต่ OBB มีขอบเขตแนบสนิทกับตัววัตถุ ทำให้ตรวจจับชิ้นงานได้ครบ 100% ไม่มีชิ้นตกหล่น
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-teal-300 text-sm">การหาตำแหน่งเชื่อมหรือขันสกรู</h3>
            <p className="text-slate-300 leading-relaxed">
              OBB ให้มุมเอียงระนาบชิ้นงาน (Part Rotation Angle) ช่วยให้แขนกลปรับหัวขันน็อตหมุนตามแนวชิ้นงานได้ทันทีโดยไม่ต้องใช้โปรแกรม Pattern Matching ซับซ้อน
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-cyan-300 text-sm">ลดอัตราของดีถูกตีเป็นของเสีย (False Overkill)</h3>
            <p className="text-slate-300 leading-relaxed">
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
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">
          <FiAlertTriangle className="w-4 h-4" /> บทที่ 4 (Module 4 - 2026 Edition)
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          การตรวจจับของเสียแบบไม่ใช้ข้อมูล NG (PatchCore / FastFlow / Anomalib)
        </h1>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
          แก้ปัญหาคลาสสิกของโรงงานอุตสาหกรรม: ไม่มีรูปของเสียเพียงพอสำหรับการเทรน AI ด้วยอัลกอริทึม Unsupervised Anomaly Detection เรียนรู้ลักษณะชิ้นงาน OK ปกติ และตรวจจับความผิดปกติที่คาดไม่ถึงได้ 100%
        </p>
      </div>

      <VisionV2PatchCoreAnomalySimulator />

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-rose-600/30 text-rose-400 flex items-center justify-center text-sm font-black border border-rose-500/40">1</span>
          กลไกการทำงานของ PatchCore ในระดับลึก
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-rose-300 text-sm">1. Feature Extraction &amp; Coreset Memory Bank</h3>
            <p className="text-slate-300 leading-relaxed">
              ใช้ Pre-trained Network (เช่น WideResNet50) สกัดเวกเตอร์ลักษณะเด่นระดับชิ้นส่วนย่อย (Patch-level features) จากรูปภาพชิ้นงานดี แล้วทำการสุ่มตัวอย่างแบบ Coreset Reduction เหลือเฉพาะเวกเตอร์ตัวแทนที่จำเป็นเพียง 1-10% เพื่อให้รันได้เร็วในระดับมิลลิวินาที
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-cyan-300 text-sm">2. Nearest Neighbor Distance Scoring</h3>
            <p className="text-slate-300 leading-relaxed">
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
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2">
          <FiLayers className="w-4 h-4" /> บทที่ 5 (Module 5 - 2026 Edition)
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Vision Transformers (ViT) &amp; Segment Anything Model (SAM 2) ในงานอุตสาหกรรม
        </h1>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
          ทำความเข้าใจการปฏิวัติวงการวิทัศน์เครื่องจักรด้วยกลไก Self-Attention เข้าใจบริบทภาพโดยรวม และการนำโมเดลรากฐาน (Foundation Models) เช่น Meta SAM 2 มาใช้สร้างหน้ากากแบ่งส่วนชิ้นงาน (Instance Segmentation) แบบเรียลไทม์
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-cyan-600/30 text-cyan-400 flex items-center justify-center text-sm font-black border border-cyan-500/40">1</span>
          CNNs vs. Vision Transformers (ViT) ในการตรวจจับความผิดปกติ
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-slate-300 text-sm">CNNs (Convolutional Neural Networks): จุดเด่นและข้อจำกัด</h3>
            <p className="text-slate-300 leading-relaxed">
              มองเห็นเฉพาะบริเวณแคบๆ (Local Receptive Field) จากการเลื่อนเคอร์เนล 3x3 หรือ 5x5 ดีสำหรับการหารอยขีดข่วนเล็กๆ แต่อ่อนแอในการจับความสัมพันธ์ระยะไกล เช่น ลวดลายวงจรพิมพ์ PCB ที่เชื่อมโยงข้ามแผง
            </p>
          </div>
          <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-2">
            <h3 className="font-bold text-cyan-300 text-sm">Vision Transformers (ViT): Global Self-Attention</h3>
            <p className="text-slate-300 leading-relaxed">
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
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-2">
          <FiZap className="w-4 h-4" /> บทที่ 6 (Module 6 - 2026 Edition)
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          การ Deploy โมเดลบน Edge NPU ด้วย TensorRT INT8 Quantization
        </h1>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
          ขั้นตอนการพอร์ตโมเดลจาก PyTorch สู่ ONNX และคอมไพล์เป็น TensorRT Engine การทำ Calibration ด้วย Post-Training Quantization (PTQ) เพื่อลดขนาดหน่วยความจำและรีดความเร็วระดับ 200+ FPS
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-teal-600/30 text-teal-400 flex items-center justify-center text-sm font-black border border-teal-500/40">1</span>
          ไปป์ไลน์การแปลงโมเดลสู่ Industrial Production Edge
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <div className="text-teal-400 font-mono font-bold">1. PyTorch Model</div>
            <p className="text-slate-300">เทรนและประเมินผลบนเครื่องเซิร์ฟเวอร์ GPU ด้วยข้อมูลภาพในโรงงาน</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <div className="text-cyan-400 font-mono font-bold">2. ONNX Export</div>
            <p className="text-slate-300">แปลง Graph ให้เป็นมาตรฐานกลาง ตัดโอเปอเรชันที่ไม่จำเป็นและรวม Layers</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <div className="text-indigo-400 font-mono font-bold">3. TensorRT PTQ</div>
            <p className="text-slate-300">ใช้ชุดภาพตัวอย่าง 100 ภาพสร้าง Scale Factor แปลงค่าน้ำหนักจาก FP32 เป็น INT8</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <div className="text-emerald-400 font-mono font-bold">4. C++ Runtime</div>
            <p className="text-slate-300">โหลด Engine รันด้วย Zero-Copy CUDA Memory ร่วมกับกล้อง GigE Vision</p>
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
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">
          <FiServer className="w-4 h-4" /> บทที่ 7 (Module 7 - 2026 Edition)
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          ระบบขับดันของเสียความเร็วสูง (High-Speed Reject), PROFINET IRT &amp; MES
        </h1>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
          การบูรณาการระบบวิชันเข้ากับกลไกทางกายภาพ: การคำนวณ Shift Register พิกัดสายพานด้วย Rotary Encoder, การควบคุมวาล์วลมเตะของเสีย (Air Jet Rejector), และการส่งข้อมูลสถิติ Defect Pareto Chart เข้าสู่ระบบ MES
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-rose-600/30 text-rose-400 flex items-center justify-center text-sm font-black border border-rose-500/40">1</span>
          การทำงานประสานกันระหว่าง AI Vision, PLC, และ MES
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-cyan-300 text-sm">Encoder Shift Register Tracking</h3>
            <p className="text-slate-300 leading-relaxed">
              เมื่อกล้องถ่ายภาพ ณ พัลส์เอนโค้ดเดอร์ที่ 12450 หากโมเดลตัดสินเป็น NG ระบบจะใส่บิต 1 ลงใน Shift Register ของ PLC เมื่อสายพานวิ่งไปถึงหัวเตะของเสียที่พัลส์ 14200 โซลินอยด์วาล์วจะยิงลมเตะชิ้นงานลงถังขยะอย่างแม่นยำ 100% แม้ความเร็วสายพานจะเปลี่ยน
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-amber-300 text-sm">PROFINET IRT Real-Time Bus</h3>
            <p className="text-slate-300 leading-relaxed">
              การสื่อสารผ่านบัสความเร็วสูงระดับไมโครวินาที ทำให้ส่งผลการตัดสิน Pass/Fail, ชนิดของเสีย, และตำแหน่งข้อบกพร่องไปยังโมดูล I/O ได้ทันทีโดยไม่เกิดปัญหา Buffer Latency
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-emerald-300 text-sm">Automated MES Quality Logging</h3>
            <p className="text-slate-300 leading-relaxed">
              ภาพของเสียพร้อมกรอบความผิดปกติจะถูกส่งไปเก็บใน Image Storage Server และบันทึกรหัสของเสียเข้าฐานข้อมูล MES ผูกกับ Work Order อัตโนมัติ เพื่อให้ผู้จัดการฝ่ายผลิตเห็น Defect Pareto Chart แบบสดๆ
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

import React from 'react';
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
  FiMaximize2
} from 'react-icons/fi';

export function MachineVisionMod1() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-blue-950/70 via-indigo-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-blue-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-3 border border-blue-500/30">
          <FiEye className="w-4 h-4" /> โมดูลที่ 1 (Module 1)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          พื้นฐานระบบ Machine Vision และโครงสร้างระบบตรวจสอบ
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          ทำความเข้าใจองค์ประกอบหลักของระบบแมชชีนวิชัน: กล้องอุตสาหกรรม, เลนส์, แสงสว่าง, เซนเซอร์ Trigger, 
          Edge Controller และการส่งสัญญาณ I/O ร่วมกับ PLC / Robot ในสายการผลิตอัจฉริยะ
        </p>
      </div>

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
    </div>
  );
}

export function MachineVisionMod2() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-cyan-950/70 via-blue-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-cyan-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold mb-3 border border-cyan-500/30">
          <FiCamera className="w-4 h-4" /> โมดูลที่ 2 (Module 2)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          การเตรียมชิ้นงาน อุปกรณ์ภาพ และการตั้งค่า Hardware
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การเลือกใช้ Global Shutter vs Rolling Shutter, การคำนวณ Optical Resolution, 
          และเทคนิคการจัดแสงสว่างอุตสาหกรรมเพื่อขจัดแสงสะท้อน (Glare)
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-cyan-600/30 text-cyan-400 flex items-center justify-center text-sm font-black border border-cyan-500/40">1</span>
          Global Shutter vs Rolling Shutter สำหรับสายพานลำเลียง
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
            <h3 className="font-bold text-emerald-300 text-sm">Global Shutter (แนะนำสำหรับสายการผลิต)</h3>
            <p className="text-slate-300">ทุกพิกเซลเปิดรับแสงพร้อมกันในเสี้ยววินาที ภาพที่ได้ไม่มีอาการภาพบิดเบี้ยว (Motion Blur / Jello Effect) แม้ชิ้นงานจะเคลื่อนที่ด้วยความเร็วสูงบนสายพาน เหมาะกับการวัดขนาดและตรวจจับรอยตำหนิ</p>
          </div>
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2">
            <h3 className="font-bold text-amber-300 text-sm">Rolling Shutter (สำหรับชิ้นงานหยุดนิ่ง)</h3>
            <p className="text-slate-300">เซนเซอร์อ่านค่าทีละแถวจากบนลงล่าง หากนำมาถ่ายวัตถุที่กำลังวิ่ง จะเกิดอาการภาพเอียงเบี้ยว (Geometric Distortion) ทำให้ผลการวัดขนาดผิดเพี้ยน จึงใช้ได้เฉพาะกรณีชิ้นงานหยุดนิ่งในจิ๊ก</p>
          </div>
        </div>
      </section>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center text-sm font-black border border-blue-500/40">2</span>
          เทคนิคการเลือกชนิดของแสง (Lighting Techniques)
        </h2>
        <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
          <li><strong>Backlight (ไฟส่องหลัง):</strong> วางแสงไว้ด้านหลังชิ้นงานเพื่อสร้างภาพเงาทึบ (Silhouette) เหมาะกับการวัดขนาดขอบ (Edge Detection) และวัดรูเกลียว</li>
          <li><strong>Coaxial Light (ไฟร่วมแกน):</strong> ปล่อยแสงผ่านกระจกสะท้อนแบบ Beam Splitter ขนานกับแกนเลนส์ ช่วยตรวจจับรอยขีดข่วนบนผิวเงาหรือแผ่นเวเฟอร์โลหะโดยไม่มีแสงสะท้อนจ้า</li>
          <li><strong>Dome Light (ไฟกระจายแสงทรงโดม):</strong> ส่องแสงสะท้อนรอบทิศทาง เหมาะกับชิ้นงานผิวโค้งมันวาว เช่น ฝากระป๋อง หรือรอยบัดกรีบนแผงวงจร PCB</li>
          <li><strong>Polarizing Filter (ฟิลเตอร์ตัดแสงสะท้อน):</strong> ติดหน้าเลนส์และแหล่งกำเนิดแสงเพื่อตัดแสงสะท้อนสะเปะสะปะจากคราบน้ำมันหล่อเย็น</li>
        </ul>
      </section>
    </div>
  );
}

export function MachineVisionMod3() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-violet-950/70 via-purple-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-violet-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold mb-3 border border-violet-500/30">
          <FiSliders className="w-4 h-4" /> โมดูลที่ 3 (Module 3)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          การเขียน Logic ตรวจสอบภาพด้วย Classical Vision และ AI Vision
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การกำหนด Region of Interest (ROI), อัลกอริทึม Edge Detection, Template Matching, 
          และการใช้ Deep Learning / Segmentation สำหรับจำแนกข้อบกพร่องที่ซับซ้อน
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-violet-600/30 text-violet-400 flex items-center justify-center text-sm font-black border border-violet-500/40">1</span>
          Classical Rule-Based Vision vs Deep Learning Vision
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-violet-300 text-sm">Rule-Based Vision (แม่นยำสูง วัดขนาดชัดเจน)</h3>
            <ul className="text-slate-300 space-y-1 list-disc list-inside">
              <li>ใช้คำสั่งทางคณิตศาสตร์ เช่น Caliper Tool, Sobel Edge, Blob Analysis</li>
              <li>เหมาะสำหรับการวัดขนาดมิติ (Dimension Measurement ±0.01mm)</li>
              <li>ตรวจนับจำนวนรู, อ่านบาร์โค้ด 1D/2D DataMatrix</li>
              <li>ประมวลผลเร็วมาก (5-15 ms) และต้องการภาพตัวอย่างน้อย</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-fuchsia-300 text-sm">AI Deep Learning Vision (ตรวจความผิดปกติผิวสัมผัส)</h3>
            <ul className="text-slate-300 space-y-1 list-disc list-inside">
              <li>ใช้โมเดล Classification, Object Detection (YOLO), และ Semantic Segmentation</li>
              <li>เก่งมากในการตรวจจับรอยแตกร้าว (Cracks), รอยขีดข่วนที่รูปทรงไม่แน่นอน</li>
              <li>ตรวจจับสิ่งแปลกปลอมในอาหาร หรือรอยไหม้ของจุดเชื่อมสปอต</li>
              <li>ยอมรับการเปลี่ยนแปลงของสภาพแสงหน้างานได้ยืดหยุ่นกว่า Rule-based</li>
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
      <div className="bg-gradient-to-r from-emerald-950/70 via-teal-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-emerald-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-3 border border-emerald-500/30">
          <FiCheckCircle className="w-4 h-4" /> โมดูลที่ 4 (Module 4)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          การกำหนดค่ากระบวนการตรวจสอบและทดสอบระบบจริง
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การบริหารจัดการค่า Margin ความปลอดภัย, การแก้ปัญหา False Reject (ชิ้นงานดีแต่เตะทิ้ง) 
          และ Escape Defect (ชิ้นงานเสียหลุดรอดสู่ลูกค้า), และการเชื่อมต่อระบบ MES
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center text-sm font-black border border-emerald-500/40">1</span>
          เกณฑ์ประเมินสมรรถนะของระบบ Machine Vision ในโรงงาน
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-2">
            <h3 className="font-bold text-rose-300 text-sm">Underkill / Escape Rate (ของเสียหลุดรอด = วิกฤตสูงสุด)</h3>
            <p className="text-slate-300">ชิ้นงานมีรอยตำหนิ แต่ระบบอ่านเป็น OK ส่งต่อไปยังลูกค้า ทำให้เกิดการเคลมสินค้าและสูญเสียชื่อเสียง เป้าหมายอุตสาหกรรมยานยนต์ต้องเป็น <strong>0 PPM</strong></p>
          </div>
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2">
            <h3 className="font-bold text-amber-300 text-sm">Overkill / False Reject Rate (งานดีแต่ถูกเตะทิ้ง)</h3>
            <p className="text-slate-300">ชิ้นงานผ่านเกณฑ์คุณภาพ แต่ระบบแจ้งว่าเป็น NG เกิดจากแสงสะท้อนหรือคราบฝุ่น ส่งผลให้ Yield ตก และต้องใช้คนมาคัดกรองซ้ำ เป้าหมายทั่วไปควบคุมไม่เกิน <strong>0.5% - 1.0%</strong></p>
          </div>
        </div>
      </section>
    </div>
  );
}

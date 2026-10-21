import React from 'react';
import { 
  FiBox, 
  FiSliders, 
  FiPlayCircle, 
  FiFileText, 
  FiAlertTriangle, 
  FiCheckCircle, 
  FiTool, 
  FiCompass, 
  FiCpu 
} from 'react-icons/fi';

export function CadCamMod1() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-orange-950/70 via-amber-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-orange-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs font-bold mb-3 border border-orange-500/30">
          <FiBox className="w-4 h-4" /> โมดูลที่ 1 (Module 1)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          พื้นฐานกระบวนการ CAD-CAM ในงานแม่พิมพ์ Mold &amp; Die
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          ภาพรวมของวงจรการผลิตแม่พิมพ์ฉีดพลาสติกและแม่พิมพ์ปั๊มโลหะ: จากโมเดล 3D สู่การวางแผนกระบวนการผลิต, 
          การคำนวณอัตราการหดตัว (Shrinkage Factor) และการจัดทำเอกสารข้อกำหนดทางเทคนิค
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-orange-600/30 text-orange-400 flex items-center justify-center text-sm font-black border border-orange-500/40">1</span>
          วงจรการทำงานแบบบูรณาการ CAD &gt; CAM &gt; CNC
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-orange-300 text-sm">1. CAD (Computer-Aided Design)</h3>
            <p className="text-slate-300">ออกแบบโมเดลชิ้นงาน 3D, แบ่งระนาบเปิด-ปิดแม่พิมพ์ (Parting Line), แยก Core/Cavity, วางระบบทางวิ่งน้ำหล่อเย็น (Cooling Line) และหมุดดันปลด (Ejector Pins)</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-amber-300 text-sm">2. CAM (Computer-Aided Manufacturing)</h3>
            <p className="text-slate-300">สร้างเส้นทางการเดินของมีดตัด (Toolpath), เลือกขนาดและชนิดของ Cutting Tools, กำหนดค่า Stepover / Stepdown, และแปลงผลลัพธ์เป็น G-Code ผ่าน Post Processor</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-emerald-300 text-sm">3. CNC Machining Center</h3>
            <p className="text-slate-300">ติดตั้งก้อนเหล็กแม่พิมพ์ (SKD11 / SKD61 / P20), เซ็ตค่าศูนย์งาน Workpiece Zero (G54), ตั้งความยาวดอกตัด Tool Offset และกัดชิ้นงานจริงตามรหัสโปรแกรม</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function CadCamMod2() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-amber-950/70 via-yellow-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-amber-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-3 border border-amber-500/30">
          <FiCompass className="w-4 h-4" /> โมดูลที่ 2 (Module 2)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          การออกแบบ CAD 2D/3D สำหรับงานแม่พิมพ์ Mold &amp; Die
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การวิเคราะห์มุมเอียงปลดชิ้นงาน (Draft Angle), การกำหนดค่าพิกัดความเผื่อ (Geometric Dimensioning &amp; Tolerance: GD&amp;T) 
          และการคำนวณการเผื่อขยายขนาดแม่พิมพ์ตามอัตราการหดตัวของพลาสติกและโลหะ
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-amber-600/30 text-amber-400 flex items-center justify-center text-sm font-black border border-amber-500/40">1</span>
          กฎเหล็ก 3 ประการในการออกแบบแม่พิมพ์
        </h2>
        <ul className="text-xs text-slate-300 space-y-2.5 list-disc list-inside">
          <li><strong>Draft Angle (มุมเอียงปลดงาน):</strong> ผนังแม่พิมพ์ต้องมีความลาดเอียงอย่างน้อย 1° ถึง 2° เสมอ เพื่อให้ชิ้นงานสามารถดันหลุดออกจากเบ้าได้โดยผิวไม่เป็นรอยขูดขีด</li>
          <li><strong>Shrinkage Scale Factor:</strong> โครงสร้างโมเดล 3D ต้องคูณขยายขนาดตามเกรดพลาสติก เช่น ชิ้นงาน PP หดตัว 1.5% - 2.0% ต้องขยายสเกล 1.015 - 1.020 เท่าใน CAD ก่อนแยก Core/Cavity</li>
          <li><strong>Wall Thickness Uniformity:</strong> ความหนาของเนื้อชิ้นงานต้องสม่ำเสมอกัน ป้องกันการเกิดรอยยุบตัว (Sink Marks) หรือการบิดเบี้ยวโก่งงอ (Warpage) ในขณะเย็นตัว</li>
        </ul>
      </section>
    </div>
  );
}

export function CadCamMod3() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-red-950/70 via-orange-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-red-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-bold mb-3 border border-red-500/30">
          <FiTool className="w-4 h-4" /> โมดูลที่ 3 (Module 3)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          กลยุทธ์การสร้าง Toolpath สำหรับงานกัดแม่พิมพ์
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การวางกลยุทธ์การกัด 3 ขั้นตอน: กัดหยาบเปิดหน้า (Roughing), กัดกึ่งละเอียด (Semi-Finishing), 
          และการกัดละเอียดเก็บผิวเงา (Finishing / High-Speed Machining)
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-red-600/30 text-red-400 flex items-center justify-center text-sm font-black border border-red-500/40">1</span>
          3 ขั้นตอนการตัดเฉือนเนื้อเหล็กแม่พิมพ์
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-rose-300 text-sm">1. Roughing (กัดหยาบ)</h3>
            <p className="text-slate-300">ใช้ดอก Face Mill หรือ Bull-nose End Mill ขนาดใหญ่ เอาก้อนเนื้อเหล็กออกให้เร็วที่สุดโดยใช้เทคนิค Adaptive Clearing คงภาระมีดตัดให้สม่ำเสมอ เผื่อผิว (Stock Allowance) ไว้ 0.3 - 0.5 mm</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-amber-300 text-sm">2. Semi-Finishing (กึ่งละเอียด)</h3>
            <p className="text-slate-300">ใช้ดอกมีดขนาดเล็กลง เพื่อขจัดรอยขั้นบันได (Rest Roughing / Corner Picking) ให้เหลือเนื้อผิวสม่ำเสมอประมาณ 0.05 - 0.1 mm ก่อนการเก็บผิวละเอียด</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-emerald-300 text-sm">3. Finishing (กัดละเอียด)</h3>
            <p className="text-slate-300">ใช้ดอก Ball Nose ปลายมน ด้วยรอบสปินเดิลสูง (High Speed Machining &gt; 12,000 RPM) ควบคุมระยะ Stepover ขนาดเล็ก เพื่อให้ได้ผิวเรียบเงา Ra &lt; 0.8 µm ลดภาระการขัดเงาด้วยมือ</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function CadCamMod4() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-purple-950/70 via-indigo-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-purple-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold mb-3 border border-purple-500/30">
          <FiPlayCircle className="w-4 h-4" /> โมดูลที่ 4 (Module 4)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          การตรวจสอบ Simulation และการประเมินความพร้อมก่อนกัดจริง
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การจำลองการกัดแบบ Solid Stock Simulation, การตรวจสอบการชนของหัวจับดอก (Holder Collision Detection), 
          การตรวจเช็คระยะยื่นมีด (Tool Stick-out) และการคำนวณ Cycle Time
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-purple-600/30 text-purple-400 flex items-center justify-center text-sm font-black border border-purple-500/40">1</span>
          Checklist ตรวจสอบ Simulation ก่อนส่งโปรแกรมขึ้นเครื่อง
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-2">
            <h3 className="font-bold text-rose-300 text-sm flex items-center gap-1.5"><FiAlertTriangle /> จุดอันตรายที่ห้ามหลุดรอด</h3>
            <ul className="text-slate-300 space-y-1 list-disc list-inside">
              <li>Collet หรือ Tool Holder กระแทกชนเข้ากับปากกาจับงาน (Vise / Fixture)</li>
              <li>การเคลื่อนที่เร็ว Rapid (G00) พุ่งชนเนื้อชิ้นงานในระนาบตัดขวาง</li>
              <li>ความยาวมีดยื่นออกมาน้อยเกินไป จนก้านมีดครูดกับขอบเบ้าแม่พิมพ์</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
            <h3 className="font-bold text-emerald-300 text-sm flex items-center gap-1.5"><FiCheckCircle /> เกณฑ์ประเมินการผ่านจำลอง</h3>
            <ul className="text-slate-300 space-y-1 list-disc list-inside">
              <li>Stock Simulation แสดงชิ้นงานสีเขียว ไร้รอยเฉือนเนื้อเกิน (Gouge)</li>
              <li>เวลาการกัดสอดคล้องกับรอบการผลิตที่วางแผนไว้ (Cycle Time Match)</li>
              <li>ระยะ Clearance Plane (ความสูงยกมีดย้ายตำแหน่ง) พ้นหัวน็อตและแคลมป์</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

export function CadCamMod5() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-teal-950/70 via-slate-900 to-slate-900 p-6 md:p-8 rounded-2xl border border-teal-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold mb-3 border border-teal-500/30">
          <FiFileText className="w-4 h-4" /> โมดูลที่ 5 (Module 5)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          การจัดการ G-code และการเชื่อมต่อกับเครื่อง CNC
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          ความเข้าใจ Post Processor ของแต่ละยี่ห้อคอนโทรลเลอร์ (Fanuc, Mitsubishi, Heidenhain, Siemens), 
          โครงสร้างรหัส NC และการโหลดโปรแกรมผ่านเครือข่าย DNC / LAN
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-teal-600/30 text-teal-400 flex items-center justify-center text-sm font-black border border-teal-500/40">1</span>
          โครงสร้างหัวโปรแกรม NC มาตรฐานความปลอดภัย
        </h2>
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
          <p className="text-teal-400 font-bold m-0">% (Start of Transmission)</p>
          <p className="text-sky-300 m-0">O1001 (PROGRAM NUMBER: MOLD_CAVITY_FINISH)</p>
          <p className="text-amber-300 m-0">G17 G21 G40 G49 G80 G90 (Safety Line: XY Plane, Metric, Cancel Radius/Length Comp, Abs Mode)</p>
          <p className="text-fuchsia-300 m-0">T01 M06 (Tool Call: R5 Ball Nose Endmill)</p>
          <p className="text-emerald-300 m-0">G54 G00 X0. Y0. S8000 M03 (Work Offset G54, Spindle CW 8000 RPM)</p>
          <p className="text-sky-300 m-0">G43 H01 Z50. M08 (Tool Length Offset Active, Coolant ON)</p>
        </div>
      </section>
    </div>
  );
}

export function CadCamMod6() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-rose-950/70 via-red-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-rose-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold mb-3 border border-rose-500/30">
          <FiAlertTriangle className="w-4 h-4" /> โมดูลที่ 6 (Module 6)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          การแก้ปัญหาหน้างาน CAD-CAM-CNC
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การวิเคราะห์สาเหตุและแก้ไขปัญหาผิวงานเป็นคลื่นสั่น (Chatter Marks), คมตัดมีดบิ่นแตก (Chipping), 
          ปัญหาชิ้นงานโก่งตัวจากการจับยึด และความคลาดเคลื่อนทางขนาด
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-rose-600/30 text-rose-400 flex items-center justify-center text-sm font-black border border-rose-500/40">1</span>
          แนวทางแก้ไขปัญหาที่พบบ่อยในการกัดแม่พิมพ์
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-rose-400 text-sm">ปัญหา: รอยสั่น Chatter Marks บนผิวเงา</h3>
            <p className="text-slate-300"><strong>สาเหตุ:</strong> ดอกมีดยื่นยาวเกินไป หรือรอบ Spindle เกิดความถี่ Resonance กับเครื่องจักร</p>
            <p className="text-emerald-400"><strong>วิธีแก้:</strong> หดระยะจับมีดให้สั้นที่สุด, เปลี่ยนรอบความเร็ว ±10% หรือใช้เทคนิค Climb Milling เสมอ</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-amber-400 text-sm">ปัญหา: คมมีดตัดบิ่นแตกระหว่างกัดหยาบ</h3>
            <p className="text-slate-300"><strong>สาเหตุ:</strong> เสียบคัตเตอร์ลงตรงๆ ในแนวดิ่ง (Plunging) หรือระบายเศษโลหะ (Chip Evacuation) ไม่ทัน</p>
            <p className="text-emerald-400"><strong>วิธีแก้:</strong> เปลี่ยนรูปแบบการลงมีดเป็นแบบเกลียวสว่าน (Helical Ramp) หรือลาดเอียง (Zigzag) และเพิ่มแรงดันน้ำหล่อเย็น</p>
          </div>
        </div>
      </section>
    </div>
  );
}

import React from 'react';
import { 
  FiCpu, 
  FiCrosshair, 
  FiTool, 
  FiCode, 
  FiActivity, 
  FiShield, 
  FiCheckCircle, 
  FiAlertTriangle, 
  FiLayers 
} from 'react-icons/fi';

export function CncMod1() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-slate-900 p-6 md:p-8 rounded-2xl border border-blue-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-3 border border-blue-500/30">
          <FiCpu className="w-4 h-4" /> โมดูลที่ 1 (Module 1)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          ระบบ CNC และโครงสร้างเครื่องจักร Machining Center
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          โครงสร้างเครื่องจักรกลควบคุมด้วยคอมพิวเตอร์ (CNC): ระบบขับเคลื่อนเซอร์โวมอเตอร์, บอลสกรู, 
          แกนการเคลื่อนที่ (X, Y, Z), จุดอ้างอิงเครื่อง (Machine Home Position) และคอนโทรลเลอร์
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center text-sm font-black border border-blue-500/40">1</span>
          กฎมือขวาและแกนการเคลื่อนที่ของเครื่อง CNC 3 แกน
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-blue-300 text-sm">แกน X (ระนาบแนวนอน ซ้าย-ขวา)</h3>
            <p className="text-slate-300">การเคลื่อนที่ตามยาวของโต๊ะงาน (Table Longitudinal). เคลื่อนที่ไปทางขวาเป็นบวก (+X), ไปทางซ้ายเป็นลบ (-X)</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-sky-300 text-sm">แกน Y (ระนาบแนวลึก หน้า-หลัง)</h3>
            <p className="text-slate-300">การเคลื่อนที่เข้า-ออกจากผู้ควบคุมเครื่อง. โต๊ะเคลื่อนที่ถอยหลังห่างตัวเป็นบวก (+Y), โต๊ะวิ่งเข้าหาตัวเป็นลบ (-Y)</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-emerald-300 text-sm">แกน Z (ระนาบแนวดิ่ง ขึ้น-ลง)</h3>
            <p className="text-slate-300">แกนหมุนของ Spindle เคลื่อนที่ยกตัวขึ้นพ้นชิ้นงานเป็นบวก (+Z), เคลื่อนที่กดต่ำลงกัดเนื้อชิ้นงานเป็นลบ (-Z)</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function CncMod2() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-cyan-950/70 via-slate-900 to-slate-900 p-6 md:p-8 rounded-2xl border border-cyan-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold mb-3 border border-cyan-500/30">
          <FiCrosshair className="w-4 h-4" /> โมดูลที่ 2 (Module 2)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          การอ่านแบบงานและระบบพิกัด Workpiece Zero
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การตีความแบบสั่งงาน (Engineering Drawing), สัญลักษณ์ความเผื่อเชิงเรขาคณิต (GD&amp;T), 
          จุดระนาบอ้างอิง (Datum A, B, C) และการเซ็ตจุดศูนย์ชิ้นงานผ่านพิกัด G54 ถึง G59
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-cyan-600/30 text-cyan-400 flex items-center justify-center text-sm font-black border border-cyan-500/40">1</span>
          ความแตกต่างระหว่าง Machine Zero (G53) vs Workpiece Zero (G54)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-cyan-300 text-sm">Machine Zero Point (ศูนย์เครื่องกล)</h3>
            <p className="text-slate-300">จุดศูนย์ตายตัวที่ผู้ผลิตเครื่องจักรติดตั้ง Limit Switch เอาไว้ มักอยู่ที่ขอบสุดมุมขวาบนของระยะชัก ใช้สำหรับจังหวะเปลี่ยนเครื่องมือตัด (Tool Change Position)</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-emerald-300 text-sm">Workpiece Zero Point (G54 - G59 ศูนย์งาน)</h3>
            <p className="text-slate-300">จุดเริ่มต้นที่โปรแกรมเมอร์กำหนดบนชิ้นงาน (เช่น มุมซ้ายบน หรือกึ่งกลางวงกลม). ช่างตั้งเครื่องจะใช้ Edge Finder หรือ Touch Probe หาพิกัดแล้วบันทึกลงหน่วยความจำ G54</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function CncMod3() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 p-6 md:p-8 rounded-2xl border border-indigo-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold mb-3 border border-indigo-500/30">
          <FiTool className="w-4 h-4" /> โมดูลที่ 3 (Module 3)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          การเตรียมชิ้นงาน เครื่องมือ และการตั้งค่า Setup &amp; Tooling
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การเลือกใช้คัตเตอร์กัดปาดหน้า (Face Mill), กัดร่อง (End Mill), ดอกสว่าน (Drill), 
          การติดตั้งปากกาจับงาน (Precision Vise) และการวัดชดเชยความยาวดอกตัด (Tool Length Offset)
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-sm font-black border border-indigo-500/40">1</span>
          ขั้นตอนการตั้งค่า Tool Length Offset (H-Code)
        </h2>
        <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
          <li><strong>ใช้ Z-Setter (บล็อกสัมผัสความสูง 50.00 mm):</strong> วางเกจวัดบนผิวบนของชิ้นงาน แล้วค่อยๆ หมุน Jog แกน Z ลงมาสัมผัสจนเข็มชี้เลข 0</li>
          <li><strong>บันทึกค่าลงตาราง Geometry Offset:</strong> กดปุ่มคำนวณบนคอนโทรลเลอร์เพื่อบันทึกระยะความยาวมีด (H1, H2, H3) ประจำแต่ละหมายเลข Tool</li>
          <li><strong>ทวนสอบด้วยคำสั่ง G43:</strong> เมื่อเรียกใช้มีดต้องตามด้วย <code>G43 H01 Z50.</code> เสมอ เพื่อให้คอนโทรลเลอร์ชดเชยความยาวมีดได้อย่างถูกต้อง</li>
        </ul>
      </section>
    </div>
  );
}

export function CncMod4() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 p-6 md:p-8 rounded-2xl border border-emerald-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-3 border border-emerald-500/30">
          <FiCode className="w-4 h-4" /> โมดูลที่ 4 (Module 4)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          การเขียนและแก้ไขโปรแกรม NC (G-Code/M-Code)
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          คำสั่งเคลื่อนที่เชิงเส้นและส่วนโค้ง (G00, G01, G02, G03), วัฏจักรงานเจาะอัตโนมัติ (Canned Cycle: G81, G83, G84), 
          และรหัสคำสั่งเบ็ดเตล็ด (M03, M05, M08, M09, M30)
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center text-sm font-black border border-emerald-500/40">1</span>
          ตารางรหัสคำสั่ง CNC พื้นฐานที่ต้องจำให้ขึ้นใจ
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
            <h3 className="font-bold text-emerald-300 text-sm">G-Codes (คำสั่งควบคุมการเคลื่อนที่)</h3>
            <p className="text-slate-300"><strong>G00:</strong> เคลื่อนที่เร็วในอากาศ (Rapid Move ห้ามใช้กินเนื้อชิ้นงาน)</p>
            <p className="text-slate-300"><strong>G01:</strong> กัดเนื้อชิ้นงานเป็นเส้นตรงตามอัตราป้อน Feed (Linear Feed)</p>
            <p className="text-slate-300"><strong>G02 / G03:</strong> กัดเนื้อชิ้นงานเป็นส่วนโค้งตามเข็ม (CW) / ทวนเข็ม (CCW)</p>
            <p className="text-slate-300"><strong>G83:</strong> วัฏจักรเจาะรูลึกแบบคายเศษโลหะ (Peck Drilling Cycle)</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
            <h3 className="font-bold text-teal-300 text-sm">M-Codes (คำสั่งกลไกสนับสนุน)</h3>
            <p className="text-slate-300"><strong>M03:</strong> สั่งหัวสปินเดิลหมุนตามเข็มนาฬิกา (Spindle ON CW)</p>
            <p className="text-slate-300"><strong>M05:</strong> สั่งหยุดหมุนหัวสปินเดิล (Spindle STOP)</p>
            <p className="text-slate-300"><strong>M08 / M09:</strong> เปิดน้ำยาหล่อเย็น Coolant ON / ปิดน้ำยาหล่อเย็น Coolant OFF</p>
            <p className="text-slate-300"><strong>M30:</strong> จบโปรแกรมและย้อนกลับไปจุดเริ่มต้น (Program End &amp; Rewind)</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function CncMod5() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 p-6 md:p-8 rounded-2xl border border-amber-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-3 border border-amber-500/30">
          <FiActivity className="w-4 h-4" /> โมดูลที่ 5 (Module 5)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          การกำหนด Cutting Conditions และทดลองตัด
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          สูตรคำนวณความเร็วตัด (Cutting Speed: Vc), ความเร็วรอบสปินเดิล (RPM: N), อัตราป้อนต่อฟัน (Feed per tooth: Fz), 
          และการปรับจูนเพื่อลดเศษครีบ (Burr) และยืดอายุการใช้งานของมีดตัด
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-amber-600/30 text-amber-400 flex items-center justify-center text-sm font-black border border-amber-500/40">1</span>
          สูตรคำนวณมาตรฐานวิศวกรรมการตัดเฉือน
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-amber-300 text-sm">1. ความเร็วรอบ Spindle Speed (N)</h3>
            <p className="font-mono text-cyan-300 text-sm bg-slate-950 p-2 rounded">N = (Vc × 1000) / (π × D)</p>
            <p className="text-slate-400">Vc = Cutting Speed (m/min) จากแคตตาล็อกดอกตัด, D = เส้นผ่านศูนย์กลางคัตเตอร์ (mm)</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-emerald-300 text-sm">2. อัตราป้อนการกัด Table Feed (F)</h3>
            <p className="font-mono text-cyan-300 text-sm bg-slate-950 p-2 rounded">F = N × Fz × Z</p>
            <p className="text-slate-400">Fz = Feed per tooth (mm/tooth), Z = จำนวนฟันคมตัด (Number of Flutes)</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function CncMod6() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-rose-950/70 via-slate-900 to-slate-900 p-6 md:p-8 rounded-2xl border border-rose-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold mb-3 border border-rose-500/30">
          <FiShield className="w-4 h-4" /> โมดูลที่ 6 (Module 6)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          การวางแผนด้านความปลอดภัยในการใช้เครื่อง CNC
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          ขั้นตอนทดสอบงานปลอดภัยก่อนปล่อย Auto: การใช้โหมด Single Block, ฟังก์ชัน Dry Run, 
          การควบคุม Feed Override &amp; Rapid Override, และระบบป้องกันการชน
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-rose-600/30 text-rose-400 flex items-center justify-center text-sm font-black border border-rose-500/40">1</span>
          กฎความปลอดภัย 4 ขั้นตอนก่อนรันชิ้นงานแรก (First Piece Release)
        </h2>
        <div className="space-y-2.5 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">Step 1</span>
            <p className="text-slate-300 m-0"><strong>Dry Run ลอยมีดเหนือชิ้นงาน:</strong> ปรับ Work Offset Z ขึ้นมา +100 mm เพื่อรันโปรแกรมในอากาศ สังเกตแนวทางการเดินมีด</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">Step 2</span>
            <p className="text-slate-300 m-0"><strong>เปิดสวิตช์ Single Block:</strong> บังคับให้โปรแกรมรันทีละบรรทัด ต้องกดย้ำ Cycle Start ทุกครั้งเพื่อยืนยันพิกัดปลายทาง</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-bold">Step 3</span>
            <p className="text-slate-300 m-0"><strong>ลด Rapid Override เหลือ 25%:</strong> ลดความเร็วการเคลื่อนที่เร็วยามมีดย้ายตำแหน่ง ให้มือวางแนบกับปุ่ม Feed Hold ตลอดเวลา</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">Step 4</span>
            <p className="text-slate-300 m-0"><strong>ตรวจเช็คเศษโลหะและกระจกฝาหน้า:</strong> ปิดประตูป้องกันเศษเหล็กและน้ำหล่อเย็นกระเด็น 100% สวมแว่นตานิรภัยตามมาตรฐานโรงงาน</p>
          </div>
        </div>
      </section>
    </div>
  );
}

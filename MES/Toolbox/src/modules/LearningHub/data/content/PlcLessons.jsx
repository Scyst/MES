import React from 'react';
import { 
  FiCpu, 
  FiRepeat, 
  FiCode, 
  FiActivity, 
  FiCheckCircle, 
  FiAlertTriangle, 
  FiSliders, 
  FiZap 
} from 'react-icons/fi';

export function PlcMod1() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-blue-950/70 via-indigo-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-blue-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-3 border border-blue-500/30">
          <FiZap className="w-4 h-4" /> โมดูลที่ 1 (Module 1)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          ระบบควบคุมไฟฟ้าและสัญญาณ I/O อุตสาหกรรม
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          ความเข้าใจเกี่ยวกับสัญญาณดิจิทัลและแอนะล็อกในโรงงาน (0-10V, 4-20mA), 
          รูปแบบการต่อวงจร Sinking vs Sourcing และการต่อเซนเซอร์ NPN vs PNP เข้าสู่โมดูลอินพุตของ PLC
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center text-sm font-black border border-blue-500/40">1</span>
          ความแตกต่างระหว่างเซนเซอร์ NPN (Sink) vs PNP (Source)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-blue-300 text-sm">NPN Sensor (Sinking Output)</h3>
            <p className="text-slate-300">เมื่อเซนเซอร์ตรวจจับวัตถุได้ จะต่อขั้วเอาต์พุตลงกราวด์ (0VDC). โมดูล PLC อินพุตต้องต่อคอมมอน (Common) เข้ากับไฟบวก (+24VDC) นิยมใช้ในเครื่องจักรฝั่งเอเชียและญี่ปุ่น (Mitsubishi / Omron)</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-teal-300 text-sm">PNP Sensor (Sourcing Output)</h3>
            <p className="text-slate-300">เมื่อเซนเซอร์ตรวจจับได้ จะจ่ายไฟบวก (+24VDC) ออกมาที่สายสัญญาณ. โมดูล PLC อินพุตต้องต่อคอมมอนเข้ากับกราวด์ (0VDC) นิยมใช้ในเครื่องจักรฝั่งยุโรปและอเมริกา (Siemens / Allen-Bradley) เพื่อความปลอดภัยทางไฟฟ้า</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function PlcMod2() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-cyan-950/70 via-slate-900 to-slate-900 p-6 md:p-8 rounded-2xl border border-cyan-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold mb-3 border border-cyan-500/30">
          <FiRepeat className="w-4 h-4" /> โมดูลที่ 2 (Module 2)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          โครงสร้างฮาร์ดแวร์ PLC และรอบการประมวลผล Scan Cycle
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          เข้าใจการทำงานภายในของหน่วยประมวลผล CPU, Memory Register (D, M, X, Y), 
          และวงรอบการประมวลผล 3 จังหวะ: Input Scan &gt; Program Execution &gt; Output Refresh
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-cyan-600/30 text-cyan-400 flex items-center justify-center text-sm font-black border border-cyan-500/40">1</span>
          3 ลำดับขั้นของ PLC Scan Cycle (เวลาเฉลี่ย 1–10 ms)
        </h2>
        <div className="space-y-2.5 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">Phase 1</span>
            <p className="text-slate-300 m-0"><strong>Input Scan (อ่านสถานะอินพุต):</strong> CPU อ่านสถานะไฟฟ้าจากเซนเซอร์ทุกตัวที่ต่อกับ Terminal แล้วคัดลอกสถานะ 0/1 เก็บลงใน Input Image Table (X)</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">Phase 2</span>
            <p className="text-slate-300 m-0"><strong>Program Execution (รันคำสั่งโปรแกรม):</strong> CPU ประมวลผลบันไดรหัส Ladder Diagram จากซ้ายไปขวา และจากบนลงล่างทีละ Rung จนจบโปรแกรม (END)</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">Phase 3</span>
            <p className="text-slate-300 m-0"><strong>Output Refresh (อัปเดตเอาต์พุตจริง):</strong> CPU สั่งจ่ายไฟหรือตัดไฟไปยังเอาต์พุตรีเลย์/ทรานซิสเตอร์จริง (Y) ตามผลลัพธ์ที่คำนวณได้</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function PlcMod3() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 p-6 md:p-8 rounded-2xl border border-emerald-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-3 border border-emerald-500/30">
          <FiCode className="w-4 h-4" /> โมดูลที่ 3 (Module 3)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          คำสั่งพื้นฐานและคำสั่งประยุกต์ใน Ladder Diagram
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การเขียนคำสั่งหน้าสัมผัสปกติเปิด (NO), ปกติปิด (NC), ขดลวดคอยล์เอาต์พุต (OUT), 
          วงจรล็อกสถานะตัวเอง (Self-Holding / Latch), ไทม์เมอร์หน่วงเวลา (Timer: T), ตัวนับจำนวน (Counter: C) และคำสั่งย้ายข้อมูล (MOV)
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center text-sm font-black border border-emerald-500/40">1</span>
          ตัวอย่างวงจร Self-Holding Circuit มาตรฐานโรงงาน
        </h2>
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
          <p className="text-cyan-300 font-bold m-0">// วงจรสั่งเปิดมอเตอร์สายพาน และหยุดฉุกเฉินด้วยปุ่ม E-Stop</p>
          <p className="text-slate-300 m-0">|--[ X000: START ]----+----[ / X001: STOP ]----[ / X002: E-STOP ]----( Y000: MOTOR )--|</p>
          <p className="text-slate-300 m-0">|                     |                                                                |</p>
          <p className="text-slate-300 m-0">|--[ Y000: LATCH ]----+                                                                |</p>
        </div>
      </section>
    </div>
  );
}

export function PlcMod4() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-teal-950/70 via-slate-900 to-slate-900 p-6 md:p-8 rounded-2xl border border-teal-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold mb-3 border border-teal-500/30">
          <FiActivity className="w-4 h-4" /> โมดูลที่ 4 (Module 4)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          การเชื่อมต่ออุปกรณ์ภาคสนามและการควบคุมอุปกรณ์จริง
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การสั่งงานกระบอกลมแบบนิวแมติกส์ผ่านโซลินอยด์วาล์ว (Solenoid Valve 5/2 ทาง), 
          ระบบหัวดูดจับสุญญากาศ (Vacuum Generator &amp; Ejector), และการอ่านพัลส์ความเร็วสูงจาก Rotary Encoder
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-teal-600/30 text-teal-400 flex items-center justify-center text-sm font-black border border-teal-500/40">1</span>
          การควบคุมจังหวะก้านสูบนิวแมติกส์ด้วย Reed Switch
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          ในระบบอัตโนมัติ ห้ามสั่งให้กระบอกลมทำงานโดยใช้ตัวตั้งเวลา (Timer) ลอยๆ เด็ดขาด! 
          ต้องติดตั้ง <strong>Magnetic Reed Switch</strong> ที่หัวและท้ายของกระบอกสูบ เพื่อยืนยันว่าก้านสูบยื่นสุด (Cylinder Extended) 
          หรือหดสุด (Cylinder Retracted) จริงก่อนจึงจะอนุญาตให้สเต็ปถัดไปทำงาน เพื่อป้องกันการชนกระแทกชิ้นงาน
        </p>
      </section>
    </div>
  );
}

export function PlcMod5() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 p-6 md:p-8 rounded-2xl border border-indigo-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold mb-3 border border-indigo-500/30">
          <FiSliders className="w-4 h-4" /> โมดูลที่ 5 (Module 5)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          การออกแบบระบบควบคุมอัตโนมัติและระบบคัดแยกชิ้นงาน
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การออกแบบลำดับการทำงานแบบ State Machine / Step Sequencer: 
          กรณีศึกษาระบบสายพานคัดแยกชิ้นงานโลหะ (Inductive Sensor) และอโลหะ (Photoelectric Sensor) อัตโนมัติ
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-sm font-black border border-indigo-500/40">1</span>
          ลำดับขั้นตอนระบบคัดแยก (Sequential Flow)
        </h2>
        <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside">
          <li><strong>Step 10:</strong> รอชิ้นงานมาถึงจุดตรวจจับ (Sensor X00) → เริ่มเดินสายพาน (Y00)</li>
          <li><strong>Step 20:</strong> ชิ้นงานตัดผ่านเซนเซอร์ Inductive (X01) ถ้ามีสัญญาณ = ชิ้นงานโลหะ, ถ้าไม่มี = ชิ้นงานพลาสติก</li>
          <li><strong>Step 30:</strong> ตัวนับ Encoder นับระยะพิกัดเดินทางจนชิ้นงานมาถึงหน้ากระบอกลมเตะงาน</li>
          <li><strong>Step 40:</strong> สั่งกระบอกลมดันชิ้นงานโลหะลงถาด A (Y01), ปล่อยชิ้นงานพลาสติกไหลลงถาด B</li>
        </ol>
      </section>
    </div>
  );
}

export function PlcMod6() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-rose-950/70 via-slate-900 to-slate-900 p-6 md:p-8 rounded-2xl border border-rose-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold mb-3 border border-rose-500/30">
          <FiAlertTriangle className="w-4 h-4" /> โมดูลที่ 6 (Module 6)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          การวิเคราะห์และแก้ไขปัญหาในระบบ PLC (Troubleshooting)
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          เทคนิคการค้นหาจุดบกพร่องหน้างาน: การดูหลอดไฟ LED แสดงสถานะ I/O บนตัว PLC, 
          การมอนิเตอร์โปรแกรมแบบ Online Monitor, การบังคับสถานะบิต (Force ON/OFF) และแนวทางความปลอดภัย
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-rose-600/30 text-rose-400 flex items-center justify-center text-sm font-black border border-rose-500/40">1</span>
          แนวทางการวินิจฉัยปัญหา PLC เมื่อเครื่องจักรหยุดกะทันหัน
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-amber-300 text-sm">1. ตรวจสอบฮาร์ดแวร์ภายนอกก่อน (80% ของปัญหา)</h3>
            <p className="text-slate-300">สังเกตไฟ LED ที่ช่อง Input: ถ้าเซนเซอร์ที่หัวเครื่องติด แต่ไฟ LED ที่หน้าโมดูล PLC ดับ แปลว่าสายสัญญาณขาดในรางกระดูกงู (Cable Carrier) หรือสายหลวม</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-sky-300 text-sm">2. เสียบสายแลนมอนิเตอร์โปรแกรม (Online Monitor)</h3>
            <p className="text-slate-300">เปิดซอฟต์แวร์ (GX Works / TIA Portal) ดูแถบสีของหน้าสัมผัสใน Ladder Diagram จะเห็นทันทีว่าตัวตัดวงจรตัวไหน (Interlock) กำลังเป็นสีน้ำเงินตัดกระแสไฟฟ้าอยู่</p>
          </div>
        </div>
      </section>
    </div>
  );
}

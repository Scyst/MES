import React from 'react';
import { 
  FiCpu, 
  FiCompass, 
  FiActivity, 
  FiShield, 
  FiPlay, 
  FiBox, 
  FiCheckCircle, 
  FiAlertTriangle 
} from 'react-icons/fi';

export function RobotMod1() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-purple-950/70 via-indigo-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-purple-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold mb-3 border border-purple-500/30">
          <FiCpu className="w-4 h-4" /> โมดูลที่ 1 (Module 1)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          พื้นฐานหุ่นยนต์อุตสาหกรรมและแนวคิด Industry 4.0
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          บทบาทของหุ่นยนต์แขนกลในโรงงานอัจฉริยะ (Smart Factory), การเปรียบเทียบประเภทหุ่นยนต์: 
          หุ่นยนต์ข้อต่อ 6 แกน (6-Axis Articulated), หุ่นยนต์ระนาบ (SCARA), และหุ่นยนต์พิกัดคาร์ทีเซียน (Cartesian / Gantry)
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-purple-600/30 text-purple-400 flex items-center justify-center text-sm font-black border border-purple-500/40">1</span>
          ประเภทหุ่นยนต์อุตสาหกรรมที่ใช้งานบ่อยที่สุด
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-purple-300 text-sm">1. 6-Axis Articulated Robot</h3>
            <p className="text-slate-300">เลียนแบบการเคลื่อนไหวของแขนมนุษย์ได้ 6 องศาอิสระ (6 DOF) คล่องตัวสูงสุด เหมาะกับงานเชื่อม (Arc/Spot Welding), พ่นสี, และงานหยิบจับชิ้นงานเข้าเครื่อง CNC</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-indigo-300 text-sm">2. SCARA Robot (4 แกน)</h3>
            <p className="text-slate-300">หมุนในระนาบแนวนอนและขยับขึ้นลงในแนวดิ่ง ความแข็งเกร็ง (Rigidity) สูงมากในแกน Z และรวดเร็วเป็นพิเศษ เหมาะกับการประกอบชิ้นส่วนอิเล็กทรอนิกส์และหยิบวาง (Pick &amp; Place)</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-sky-300 text-sm">3. Collaborative Robot (Cobot)</h3>
            <p className="text-slate-300">หุ่นยนต์ที่ติดตั้งเซนเซอร์ตรวจจับแรงกระแทก (Torque Sensors) สามารถทำงานเคียงข้างมนุษย์ได้โดยไม่ต้องมีรั้วกั้นตาข่ายนิรภัย หากชนมนุษย์จะหยุดอัตโนมัติ</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function RobotMod2() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 p-6 md:p-8 rounded-2xl border border-indigo-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold mb-3 border border-indigo-500/30">
          <FiCompass className="w-4 h-4" /> โมดูลที่ 2 (Module 2)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          โครงสร้างหุ่นยนต์ ระบบพิกัด และโหมดการเคลื่อนที่
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          ทำความเข้าใจข้อต่อทั้ง 6 แกน (J1 ถึง J6), จุดศูนย์กลางเครื่องมือ (Tool Center Point: TCP), 
          และระบบพิกัด 3 โหมดหลัก: Joint Coordinate, World / Base Coordinate, และ Tool Coordinate
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-sm font-black border border-indigo-500/40">1</span>
          3 ระบบพิกัดที่ใช้สั่งงานหุ่นยนต์ (Coordinate Systems)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-indigo-300 text-sm">1. Joint Coordinate (พิกัดแกน)</h3>
            <p className="text-slate-300">สั่งหมุนแกนใดแกนหนึ่งเฉพาะตัว (องศา -180° ถึง +180°) เหมาะสำหรับโยกขยับแขนกลออกจากท่าพับ หรือดึงแขนออกจากจุด Singularity</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-sky-300 text-sm">2. World / Base Coordinate (พิกัดโลก)</h3>
            <p className="text-slate-300">อ้างอิงจุดศูนย์กลางฐานของหุ่นยนต์เป็นแกน X/Y/Z หุ่นยนต์จะคำนวณการหมุนของทุกข้อต่อพร้อมกันเพื่อให้ปลายมือวิ่งเป็นเส้นตรงขนานกับพื้นโรงงาน</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-teal-300 text-sm">3. Tool Coordinate (พิกัดหัวจับ)</h3>
            <p className="text-slate-300">อ้างอิงแกนทิศทางตามแนวปลายหัวจับหรือมือกริปเปอร์ (TCP) สะดวกมากในจังหวะสั่งให้ปลายมือพุ่งเข้าหยิบหรือถอยออกจากเบ้าแม่พิมพ์</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function RobotMod3() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-teal-950/70 via-slate-900 to-slate-900 p-6 md:p-8 rounded-2xl border border-teal-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold mb-3 border border-teal-500/30">
          <FiActivity className="w-4 h-4" /> โมดูลที่ 3 (Module 3)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          ระบบไฟฟ้าและสัญญาณ I/O ระหว่างหุ่นยนต์กับสายการผลิต
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การต่อสายสัญญาณควบคุมอุปกรณ์ปลายแขน (End Effector), โซลินอยด์วาล์วกริปเปอร์ (Gripper), 
          ตัวดูดสุญญากาศ (Vacuum Pad), ไฟแสดงสถานะ Tower Lamp และการ Handshake สัญญาณกับ PLC
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-teal-600/30 text-teal-400 flex items-center justify-center text-sm font-black border border-teal-500/40">1</span>
          สัญญาณ Handshaking ระหว่าง Robot และเครื่องจักรภายนอก
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-teal-300 text-sm">สัญญาณจาก Robot ไปยัง PLC (Output)</h3>
            <ul className="text-slate-300 space-y-1 list-disc list-inside">
              <li><strong>Robot Ready:</strong> หุ่นยนต์เปิดสแตนด์บายพร้อมทำงาน</li>
              <li><strong>In Cycle:</strong> หุ่นยนต์กำลังวิ่งในวงรอบการทำงาน</li>
              <li><strong>Area Safe:</strong> ปลายแขนกลพ้นออกจากพื้นที่เครื่องปั๊มแล้ว ปลอดภัยในการปิดแม่พิมพ์</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-cyan-300 text-sm">สัญญาณจาก PLC มายัง Robot (Input)</h3>
            <ul className="text-slate-300 space-y-1 list-disc list-inside">
              <li><strong>Start Request:</strong> มีชิ้นงานมารอพร้อมให้หยิบ</li>
              <li><strong>Machine Door Opened:</strong> ประตูเครื่องจักรเปิดสุดแล้ว หุ่นยนต์เข้าไปได้</li>
              <li><strong>Part OK / NG:</strong> ชิ้นงานผ่านการตรวจสอบคุณภาพหรือไม่</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

export function RobotMod4() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-red-950/70 via-rose-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-red-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-bold mb-3 border border-red-500/30">
          <FiShield className="w-4 h-4" /> โมดูลที่ 4 (Module 4)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          มาตรฐานความปลอดภัยในการทำงานร่วมกับหุ่นยนต์ (Robot Safety)
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          มาตรฐานสากล ISO 10218 และ ISO/TS 15066: ม่านแสงนิรภัย (Safety Light Curtain), 
          ประตูรั้วสวิตช์อินเตอร์ล็อก (Safety Interlock), สวิตช์นิรภัย 3 จังหวะ (Deadman Switch) และเขตการเคลื่อนที่ปลอดภัย
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-red-600/30 text-red-400 flex items-center justify-center text-sm font-black border border-red-500/40">1</span>
          กลไกความปลอดภัยระดับชีวิต (Life Safety Systems)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-rose-300 text-sm">1. 3-Position Deadman Switch</h3>
            <p className="text-slate-300">สวิตช์หลัง Teach Pendant: ต้องกดค้างไว้ที่ตำแหน่งตรงกลาง (Half-pressed) เท่านั้นหุ่นยนต์จึงจะเคลื่อนที่ หากปล่อยมือหลุด (ตกใจ) หรือบีบกำแน่นเกินไป (ถูกหนีบ) ระบบเซอร์โวจะตัดไฟทันที</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-amber-300 text-sm">2. Safety Light Curtain &amp; Interlock Gate</h3>
            <p className="text-slate-300">เมื่อมีมนุษย์ก้าวข้ามลำแสงหรือเปิดประตูรั้วตาข่ายเข้าไปในกรงหุ่นยนต์ ระบบ Safety Relay ระดับ Category 4 / Ple จะสั่งตัดกระแสไฟเบรกฉุกเฉิน (Emergency Stop) ภายใน 20 มิลลิวินาที</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function RobotMod5() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-slate-900 p-6 md:p-8 rounded-2xl border border-blue-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-3 border border-blue-500/30">
          <FiPlay className="w-4 h-4" /> โมดูลที่ 5 (Module 5)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          การใช้ Teach Pendant และการเขียนโปรแกรมหุ่นยนต์เบื้องต้น
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          ฝึกใช้งานรีโมตควบคุม Teach Pendant: การสอนจุดพิกัดตำแหน่ง (Teaching Points), 
          คำสั่งเคลื่อนที่แบบจุดต่อจุด (PTP / MOVEJ) vs เคลื่อนที่แนวเส้นตรง (LIN / MOVEL), และการกำหนดความเร็วและเร่ง
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center text-sm font-black border border-blue-500/40">1</span>
          ความแตกต่างระหว่างคำสั่ง MOVEJ (PTP) vs MOVEL (Linear)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-blue-300 text-sm">MOVEJ / PTP (Point-to-Point)</h3>
            <p className="text-slate-300">ทุกข้อต่อหมุนด้วยความเร็วสูงสุดไปถึงจุดหมายพร้อมกัน เส้นทางเดินในอากาศจะเป็นเส้นโค้ง เหมาะสำหรับการเคลื่อนย้ายแขนกลข้ามระยะทางไกลในพื้นที่โล่ง</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-emerald-300 text-sm">MOVEL / LIN (Linear Motion)</h3>
            <p className="text-slate-300">ปลายมือ (TCP) เคลื่อนที่เป็นเส้นตรงแม่นยำ เหมาะสำหรับจังหวะเสียบชิ้นงานลงรู, การทากาวตามขอบ, หรือการหยิบชิ้นงานขึ้นตรงๆ ไม่ให้ชนขอบเบ้า</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function RobotMod6() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 p-6 md:p-8 rounded-2xl border border-emerald-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-3 border border-emerald-500/30">
          <FiBox className="w-4 h-4" /> โมดูลที่ 6 (Module 6)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          การประยุกต์ใช้งานจริงในโรงงานและ Workshop
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          Workshop จำลองสถานการณ์จริงจากสายการผลิต: ระบบหยิบจับชิ้นงานจากสายพาน (Pick &amp; Place), 
          การจัดเรียงชิ้นงานลงพาเลท (Palletizing Pattern), และขั้นตอนการแก้ปัญหาเมื่อหุ่นยนต์หยุดค้าง (Troubleshooting)
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center text-sm font-black border border-emerald-500/40">1</span>
          ลำดับขั้นตอน Workshop: Pick &amp; Place กับสายพานลำเลียง
        </h2>
        <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside">
          <li><strong>Wait Position:</strong> แขนกลจอดรอเหนือสายพาน (Home Position) พร้อมสัญญาณ Sensor ON</li>
          <li><strong>Approach Move:</strong> สั่ง MOVEL ลงมาที่ความสูงเหนือชิ้นงาน 50 mm (Approach Point)</li>
          <li><strong>Pick Action:</strong> เคลื่อนที่ลงจับชิ้นงาน สั่ง Gripper CLOSE / Vacuum ON และตรวจสอบสัญญาณ Vacuum Sensor ยืนยันว่าดูดติดจริง</li>
          <li><strong>Retract Move:</strong> ยกแขนกลขึ้นแนวดิ่ง 100 mm เพื่อพ้นขอบสายพาน</li>
          <li><strong>Place Move:</strong> สั่ง MOVEJ ข้ามไปยังถาดวางชิ้นงาน แล้ว MOVEL ปล่อยชิ้นงานลงกล่อง (Drop &amp; Release)</li>
        </ol>
      </section>
    </div>
  );
}

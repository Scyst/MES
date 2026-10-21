import React, { useState } from 'react';
import { 
  FiLayers, 
  FiCpu, 
  FiLayout, 
  FiCode, 
  FiActivity, 
  FiCheckSquare, 
  FiShield, 
  FiServer, 
  FiBell, 
  FiArrowRight, 
  FiCheck, 
  FiCopy, 
  FiSmartphone, 
  FiMonitor, 
  FiTerminal,
  FiZap,
  FiAlertTriangle,
  FiFileText,
  FiDatabase,
  FiRefreshCw
} from 'react-icons/fi';

// Copy to clipboard helper
function CodeBlock({ code, language = 'javascript' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-xl overflow-hidden my-4 border border-slate-700 bg-slate-950/90 font-mono text-xs md:text-sm shadow-xl">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-slate-400">
        <span className="flex items-center gap-1.5 uppercase font-bold text-[11px] text-fuchsia-400">
          <FiTerminal className="w-3.5 h-3.5" /> {language}
        </span>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] hover:text-white transition-colors bg-slate-800 px-2 py-0.5 rounded"
        >
          {copied ? <><FiCheck className="text-emerald-400 w-3 h-3" /> คัดลอกแล้ว</> : <><FiCopy className="w-3 h-3" /> คัดลอกโค้ด</>}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-slate-200 leading-relaxed m-0">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// =========================================================================
// MODULE 1: Enterprise System & Digital Industry Landscape
// =========================================================================
export function EnterpriseAppMod1() {
  return (
    <div className="space-y-8 text-slate-200">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-violet-950/70 via-indigo-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-violet-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold mb-3 border border-violet-500/30">
          <FiLayers className="w-4 h-4" /> โมดูลที่ 1 (Module 1)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          Enterprise System & Digital Industry Landscape
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          ทำความเข้าใจสถาปัตยกรรมระบบองค์กรดิจิทัล การหลอมรวมระหว่างเทคโนโลยีสารสนเทศ (IT) 
          และเทคโนโลยีปฏิบัติการหน้างาน (OT) เพื่อเชื่อมโยงข้อมูลจากเครื่องจักรสู่ผู้บริหารแบบ Real-time
        </p>
      </div>

      {/* 1.1 Digital Transformation Overview */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-violet-600/30 text-violet-400 flex items-center justify-center text-sm font-black border border-violet-500/40">1</span>
          1.1 การเปลี่ยนผ่านสู่องค์กรดิจิทัล (Digital Transformation in Industry 4.0)
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          ในยุคอุตสาหกรรม 4.0 องค์กรการผลิตไม่สามารถพึ่งพาวิธีการทำงานแบบเดิมที่ใช้กระดาษ (Paper-based) หรือไฟล์สเปรดชีต (Spreadsheet) 
          ที่ต้องรอคนป้อนข้อมูลท้ายกะได้อีกต่อไป เพราะทำให้ข้อมูลล่าช้า เกิดความผิดพลาดจากการป้อนข้อมูลซ้ำซ้อน (Data Redundancy) 
          และการตัดสินใจของผู้บริหารคลาดเคลื่อน
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="bg-rose-950/30 border border-rose-500/30 p-4 rounded-xl space-y-2">
            <h3 className="text-sm font-bold text-rose-300 flex items-center gap-1.5">
              <FiAlertTriangle className="w-4 h-4" /> ระบบเดิม (Legacy Shop Floor)
            </h3>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>จดบันทึกยอดผลิตและของเสียลงกระดาษหน้าเครื่อง</li>
              <li>ผู้จัดการทราบยอดการผลิตจริงในวันถัดไป (ล่าช้า 12-24 ชม.)</li>
              <li>ข้อมูลเครื่องจักรเสีย (Breakdown) ถูกบันทึกด้วยความจำ</li>
              <li>ขาดระบบตรวจสอบย้อนกลับ (Traceability) เมื่อลูกค้าเคลมของเสีย</li>
            </ul>
          </div>

          <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-xl space-y-2">
            <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
              <FiCheck className="w-4 h-4" /> องค์กรที่ขับเคลื่อนด้วยข้อมูล (Data-Driven Smart Factory)
            </h3>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>รับสัญญาณนับชิ้นงานจริงจาก PLC / Sensor อัตโนมัติ</li>
              <li>แสดงผล OEE และสถานะเครื่องจักรบนหน้าจอแบบ Near Real-time</li>
              <li>เมื่อเกิด Alarm ระบบส่งแจ้งเตือนเข้าแอปพลิเคชันมือถือทันที</li>
              <li>ยิงสแกน Barcode/QR Code ผูกโยง Coil Lot กับชิ้นงาน 100%</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 1.2 IT vs OT Integration & ISA-95 */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-sm font-black border border-indigo-500/40">2</span>
          1.2 การเชื่อมโยง IT vs OT (IT/OT Convergence & ISA-95 Hierarchy)
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          ความท้าทายหลักของการสร้าง Enterprise Application ในโรงงานคือการเชื่อมโลกของ <strong>IT (Information Technology)</strong> 
          เข้ากับ <strong>OT (Operational Technology)</strong> ตามมาตรฐานสากล <strong>ISA-95</strong>:
        </p>

        {/* ISA-95 Pyramidal Hierarchy Card */}
        <div className="space-y-2.5 pt-2">
          <div className="p-3.5 rounded-xl bg-purple-900/40 border border-purple-500/40 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black text-purple-300 uppercase tracking-wider">Level 4: Enterprise (IT)</span>
              <p className="text-sm font-bold text-white m-0">ERP (SAP / Oracle), CRM, Business Intelligence</p>
            </div>
            <span className="text-xs text-purple-300 bg-purple-950/80 px-2.5 py-1 rounded border border-purple-500/30 font-mono">Month / Week</span>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-900/40 border border-indigo-500/40 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black text-indigo-300 uppercase tracking-wider">Level 3: Operations (IT/OT Bridge)</span>
              <p className="text-sm font-bold text-white m-0">MES (Manufacturing Execution System), Quality, WMS</p>
            </div>
            <span className="text-xs text-indigo-300 bg-indigo-950/80 px-2.5 py-1 rounded border border-indigo-500/30 font-mono">Shift / Hour</span>
          </div>

          <div className="p-3.5 rounded-xl bg-cyan-900/40 border border-cyan-500/40 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black text-cyan-300 uppercase tracking-wider">Level 2: Control (OT)</span>
              <p className="text-sm font-bold text-white m-0">SCADA, HMI, Edge Computing, Industrial IPC</p>
            </div>
            <span className="text-xs text-cyan-300 bg-cyan-950/80 px-2.5 py-1 rounded border border-cyan-500/30 font-mono">Minutes / Seconds</span>
          </div>

          <div className="p-3.5 rounded-xl bg-teal-900/40 border border-teal-500/40 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black text-teal-300 uppercase tracking-wider">Level 1: Sensing & Manipulation (OT)</span>
              <p className="text-sm font-bold text-white m-0">PLC (Programmable Logic Controller), VFD, Robot Controllers</p>
            </div>
            <span className="text-xs text-teal-300 bg-teal-950/80 px-2.5 py-1 rounded border border-teal-500/30 font-mono">Milliseconds (ms)</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Level 0: Physical Process</span>
              <p className="text-sm font-bold text-white m-0">Proximity Sensors, Thermocouples, Solenoid Valves, Conveyors</p>
            </div>
            <span className="text-xs text-slate-400 bg-slate-900 px-2.5 py-1 rounded font-mono">Physical Signal</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-violet-950/30 border-l-4 border-violet-500 text-xs text-slate-300 leading-relaxed mt-4">
          <strong className="text-violet-300">หน้าที่ของ Enterprise Application Developer:</strong> ออกแบบสะพานเชื่อมโยง (Bridge) ระหว่าง Level 1-2 (สัญญาณไฟฟ้า, บิตรีเลย์, โปรโตคอล Modbus/OPC-UA) ขึ้นสู่ Level 3-4 (Web API, JSON, ฐานข้อมูลเชิงสัมพันธ์, และแดชบอร์ดตอบสนองผู้ใช้)
        </div>
      </section>

      {/* 1.3 Modern Application Architecture */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-fuchsia-600/30 text-fuchsia-400 flex items-center justify-center text-sm font-black border border-fuchsia-500/40">3</span>
          1.3 สถาปัตยกรรมแอปพลิเคชันยุคใหม่ (Client-Server, Microservices & Low-Code)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
            <h3 className="font-bold text-fuchsia-300 text-sm">Monolithic Architecture</h3>
            <p className="text-slate-400">ระบบเดิมที่รวม Frontend, Backend, Database และ Business Logic ไว้ในโปรแกรมเดียว ข้อดีคือทำง่ายในช่วงแรก แต่เมื่อระบบใหญ่จะแก้ไขยาก และหากระบบย่อยใดพังจะหยุดชะงักทั้งโรงงาน</p>
          </div>
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
            <h3 className="font-bold text-sky-300 text-sm">Client-Server & RESTful</h3>
            <p className="text-slate-400">แยกส่วนติดต่อผู้ใช้ (Frontend React/Vite) ออกจากส่วนประมวลผลข้อมูล (Backend API). สื่อสารผ่าน JSON ทำให้หน้าเว็บมีความคล่องตัวสูง รองรับทั้งคอมพิวเตอร์และมือถือ</p>
          </div>
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
            <h3 className="font-bold text-emerald-300 text-sm">Edge AI & Microservices</h3>
            <p className="text-slate-400">แยกเซอร์วิสเฉพาะทาง เช่น Node-RED สำหรับต่อ PLC, Python สำหรับ Vision AI, และ PHP/Node สำหรับ Business Logic. ทำงานอิสระแม้ระบบภายนอกจะหลุดการเชื่อมต่อ</p>
          </div>
        </div>
      </section>
    </div>
  );
}

// =========================================================================
// MODULE 2: Industrial UX/UI & Software Design
// =========================================================================
export function EnterpriseAppMod2() {
  return (
    <div className="space-y-8 text-slate-200">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-pink-950/70 via-rose-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-pink-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold mb-3 border border-pink-500/30">
          <FiLayout className="w-4 h-4" /> โมดูลที่ 2 (Module 2)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          Industrial UX/UI & Software Design for Industry
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การออกแบบส่วนติดต่อผู้ใช้งาน (UI) และประสบการณ์ผู้ใช้ (UX) สำหรับสภาพแวดล้อมหน้างานโรงงาน: 
          ลดความผิดพลาดในการคีย์ข้อมูล ปุ่มสัมผัสขนาดใหญ่ และแดชบอร์ดแสดงผลความเร็วสูง
        </p>
      </div>

      {/* 2.1 User-Centered Design for Factory Operators */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-pink-600/30 text-pink-400 flex items-center justify-center text-sm font-black border border-pink-500/40">1</span>
          2.1 หลักการออกแบบสำหรับพนักงานหน้างาน (Operator-Centered Design)
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          การออกแบบแอปพลิเคชันสำหรับโรงงาน แตกต่างจากการทำเว็บอีคอมเมิร์ซทั่วไปโดยสิ้นเชิง 
          เนื่องจากพนักงานปฏิบัติการต้องทำงานท่ามกลางเสียงดัง แสงสะท้อน มีคราบน้ำมัน หรืออาจต้องสวมถุงมือทำงาน
        </p>

        {/* 4 Golden Rules Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="text-sm font-bold text-pink-400 flex items-center gap-2">
              <FiSmartphone className="w-4 h-4" /> 1. Minimum Touch Target (44x44px)
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              ปุ่มกดยืนยัน ปุ่มบันทึกยอด หรือปุ่มแจ้งเหตุเสีย ต้องมีขนาดพื้นที่แตะสัมผัสอย่างน้อย <strong>44×44 พิกเซล</strong> เสมอ เพื่อให้ใช้นิ้วสัมผัสบนแท็บเล็ตได้สะดวกแม้สวมถุงมือยางหรือผ้า
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <FiZap className="w-4 h-4" /> 2. High Contrast & Glare Resistance
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              ใช้คู่สีที่มีค่า Contrast สูง (เช่น ข้อความสีขาวบนพื้นเข้ม หรือสีดำบนพื้นเหลือง) ตัวหนังสือสถานะเครื่องจักร (RUN / STOP / ALARM) ต้องมองเห็นได้ชัดเจนในระยะ 2–3 เมตรจากตัวเครื่อง
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="text-sm font-bold text-sky-400 flex items-center gap-2">
              <FiCheckSquare className="w-4 h-4" /> 3. Poka-Yoke Input (ป้องกันการคีย์ผิด)
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              หลีกเลี่ยงการให้พนักงานพิมพ์ตัวเลขด้วยแป้นพิมพ์เสมือนแบบอิสระ ให้ใช้ Barcode Scanner, ปุ่มตัวเลข Numpad ล็อกขอบเขต Min/Max, หรือตัวเลือก Quick Buttons เช่น (+1, +5, +10)
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <FiActivity className="w-4 h-4" /> 4. Immediate Tactile & Visual Feedback
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              เมื่อกดบันทึกข้อมูลสำเร็จ ต้องมีสถานะสีเขียว Toast หรือเสียง Beep สัญญาณตอบสนองทันที ป้องกันพนักงานกดปุ่มซ้ำรัวๆ (Double Submit) จนเกิดข้อมูลขยะในฐานข้อมูล
            </p>
          </div>
        </div>
      </section>

      {/* 2.2 Wireframing & Prototyping */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-rose-600/30 text-rose-400 flex items-center justify-center text-sm font-black border border-rose-500/40">2</span>
          2.2 การร่างแบบ Flow Diagram และ Wireframe (Low-Fidelity Prototype)
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          ก่อนลงมือเขียนโค้ดจริง นักพัฒนาแอปพลิเคชันต้องจัดทำ <strong>User Flow Diagram</strong> เพื่อเดินสำรวจหน้างาน (Gemba Walk) 
          และทดสอบความเข้าใจกับหัวหน้างานและพนักงานจริง
        </p>

        {/* Workflow Diagram Box */}
        <div className="bg-slate-950 p-4 md:p-6 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-3">
          <div className="text-amber-400 font-bold text-center">ตัวอย่าง: แผนผังลำดับงานบันทึกงานผลิต (Production Recording Flow)</div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-center pt-2">
            <div className="w-full md:w-1/4 p-3 rounded-lg bg-slate-800 border border-slate-700">
              <span className="text-sky-400 font-bold">1. สแกนเข้ากะ</span>
              <p className="text-[11px] text-slate-400 m-0 mt-1">ยิงบัตรพนักงาน + สแกน Job Order QR</p>
            </div>
            <FiArrowRight className="text-slate-500 w-5 h-5 hidden md:block" />
            <div className="w-full md:w-1/4 p-3 rounded-lg bg-slate-800 border border-slate-700">
              <span className="text-fuchsia-400 font-bold">2. ยืนยันเครื่อง</span>
              <p className="text-[11px] text-slate-400 m-0 mt-1">ตรวจสถานะเครื่องจักร (Sensor OK)</p>
            </div>
            <FiArrowRight className="text-slate-500 w-5 h-5 hidden md:block" />
            <div className="w-full md:w-1/4 p-3 rounded-lg bg-slate-800 border border-slate-700">
              <span className="text-emerald-400 font-bold">3. ผลิต &amp; นับยอด</span>
              <p className="text-[11px] text-slate-400 m-0 mt-1">PLC ดันยอด Good / คีย์ Reject NG</p>
            </div>
            <FiArrowRight className="text-slate-500 w-5 h-5 hidden md:block" />
            <div className="w-full md:w-1/4 p-3 rounded-lg bg-slate-800 border border-slate-700">
              <span className="text-amber-400 font-bold">4. ปิดกะ &amp; พิมพ์ Tag</span>
              <p className="text-[11px] text-slate-400 m-0 mt-1">พิมพ์ใบพาเลทเข้าระบบคลัง WMS</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2.3 Executive Dashboard vs Shop Floor Cockpit */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-purple-600/30 text-purple-400 flex items-center justify-center text-sm font-black border border-purple-500/40">3</span>
          2.3 การออกแบบแดชบอร์ดระดับผู้บริหาร vs หน้าจอผู้ปฏิบัติงาน (Top Floor vs Shop Floor)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2">
            <h3 className="text-sm font-bold text-purple-300 flex items-center gap-1.5">
              <FiMonitor className="w-4 h-4" /> แดชบอร์ดผู้บริหาร (Executive Overview)
            </h3>
            <ul className="text-slate-300 space-y-1.5 list-disc list-inside">
              <li><strong>KPIs รวม:</strong> OEE เฉลี่ยของทั้งโรงงาน, อัตราผลผลิตตามเป้า (Plan vs Actual)</li>
              <li><strong>กราฟแนวโน้ม:</strong> Pareto สาเหตุของเสียรายสัปดาห์, ต้นทุน COGS</li>
              <li><strong>การใช้งาน:</strong> เปิดดูผ่านโน้ตบุ๊ก หรือจอห้องประชุม (Information Density สูง)</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2">
            <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-1.5">
              <FiSmartphone className="w-4 h-4" /> หน้าจอหน้าเครื่องจักร (Line Operator Cockpit)
            </h3>
            <ul className="text-slate-300 space-y-1.5 list-disc list-inside">
              <li><strong>โฟกัสเฉพาะชิ้นงานปัจจุบัน:</strong> ชิ้นงานที่กำลังทำ, สเปกความหนา Tolerance</li>
              <li><strong>ปุ่มควบคุมชัดเจน:</strong> ปุ่มแจ้งช่างซ่อมบำรุง, ปุ่มรายงานชิ้นงาน NG</li>
              <li><strong>ป้องกัน Alarm Fatigue:</strong> แสดงเฉพาะสัญญาณเตือนวิกฤตที่ต้องหยุดเครื่องทันที</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

// =========================================================================
// MODULE 3: Web & Application Development
// =========================================================================
export function EnterpriseAppMod3() {
  const sampleFetchCode = `// ตัวอย่าง: การดึงข้อมูล Telemetry เครื่องจักรผ่าน REST API แบบ Asynchronous
async function fetchMachineTelemetry(machineId) {
  const statusBadge = document.getElementById('machine-status');
  const tempDisplay = document.getElementById('temp-val');

  try {
    // 1. เรียก API ด้วย fetch พร้อมส่ง Token สิทธิ์การเข้าถึง
    const response = await fetch(\`/api/v1/telemetry/\${machineId}\`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': 'Bearer ' + sessionStorage.getItem('token')
      }
    });

    if (!response.ok) {
      throw new Error(\`HTTP Error: \${response.status}\`);
    }

    // 2. แปลงข้อมูล JSON
    const data = await response.json();

    // 3. ปรับแต่ง DOM โดยไม่ทำให้หน้าจอค้าง
    tempDisplay.textContent = \`\${data.temperature.toFixed(1)} °C\`;
    if (data.temperature > 85.0) {
      statusBadge.className = 'badge bg-danger';
      statusBadge.textContent = 'HIGH TEMPERATURE WARNING';
    } else {
      statusBadge.className = 'badge bg-success';
      statusBadge.textContent = 'NORMAL OPERATION';
    }

  } catch (error) {
    console.error('Failed to fetch machine telemetry:', error);
    statusBadge.textContent = 'DISCONNECTED';
  }
}`;

  const sampleJsonCode = `// ตัวอย่าง: การแปลงและคำนวณข้อมูลชิ้นงานเสีย (Defect Pareto) จาก JSON Array
const rawInspectionData = [
  { partId: "P-101", defectType: "BURR", count: 12 },
  { partId: "P-102", defectType: "SCRATCH", count: 4 },
  { partId: "P-103", defectType: "BURR", count: 8 },
  { partId: "P-104", defectType: "DENT", count: 2 }
];

// 1. รวมยอดของเสียตามประเภทด้วย reduce()
const summaryByDefect = rawInspectionData.reduce((acc, item) => {
  acc[item.defectType] = (acc[item.defectType] || 0) + item.count;
  return acc;
}, {});

console.log(summaryByDefect);
// Output: { BURR: 20, SCRATCH: 4, DENT: 2 }

// 2. กรองเฉพาะของเสียวิกฤต (Critical Defects > 5 ชิ้น)
const criticalDefects = Object.entries(summaryByDefect)
  .filter(([defect, qty]) => qty > 5)
  .map(([defect, qty]) => ({ defect, qty }));

console.log(criticalDefects);
// Output: [ { defect: 'BURR', qty: 20 } ]`;

  return (
    <div className="space-y-8 text-slate-200">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-cyan-950/70 via-blue-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-cyan-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold mb-3 border border-cyan-500/30">
          <FiCode className="w-4 h-4" /> โมดูลที่ 3 (Module 3)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          Web &amp; Application Development (Hybrid Standards)
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การเขียนโค้ดและพัฒนา Web Application ตามมาตรฐานสากล: Semantic HTML5, CSS Grid/Flexbox, 
          JavaScript ES6+ การเขียนคำสั่งแบบ Asynchronous (Async/Await), และการประมวลผล JSON
        </p>
      </div>

      {/* 3.1 Frontend Fundamentals */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-cyan-600/30 text-cyan-400 flex items-center justify-center text-sm font-black border border-cyan-500/40">1</span>
          3.1 โครงสร้าง Semantic HTML5 &amp; CSS Layout สำหรับหน้าจอโรงงาน
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          ในระบบอุตสาหกรรม การใช้แท็ก Semantic HTML เช่น <code>&lt;form&gt;</code>, <code>&lt;table&gt;</code>, 
          <code>&lt;fieldset&gt;</code>, และ <code>&lt;progress&gt;</code> ช่วยให้เบราว์เซอร์และเครื่องอ่านบาร์โค้ด
          สามารถทำงานร่วมกันได้อย่างแม่นยำ ไม่สับสนตำแหน่งโฟกัส
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-cyan-300 text-sm">CSS Flexbox Layout</h3>
            <p className="text-slate-300">
              เหมาะสำหรับการจัดวางปุ่มควบคุม (Action Buttons), กล่องเครื่องมือแถบด้านบน (Toolbars), 
              และการกระจายระยะห่างของแท็บเมนูให้ยืดหยุ่นตามความกว้างหน้าจอแท็บเล็ต
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-blue-300 text-sm">CSS Grid System</h3>
            <p className="text-slate-300">
              เหมาะสำหรับการออกแบบ <strong>Machine Dashboard Grid</strong> แบ่งคอลัมน์แสดงพารามิเตอร์ 
              (เช่น 4 คอลัมน์บนจอคอมพิวเตอร์ และยุบเป็น 1 คอลัมน์บนหน้าจอมือถือพนักงาน)
            </p>
          </div>
        </div>
      </section>

      {/* 3.2 Asynchronous JS & API Consuming */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center text-sm font-black border border-blue-500/40">2</span>
          3.2 Asynchronous Programming (Async/Await) &amp; Fetching Machine Data
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          เมื่อเว็บแอปพลิเคชันต้องส่งคำร้องขอข้อมูลสถานะเครื่องจักรหรือดึงยอดผลิตจากเซิร์ฟเวอร์ 
          การประมวลผลต้องเป็นแบบ <strong>Non-blocking Asynchronous</strong> เสมอ เพื่อไม่ให้หน้าจอควบคุมแข็งค้าง 
          ในขณะที่พนักงานกำลังกดยืนยันชิ้นงาน:
        </p>

        <CodeBlock code={sampleFetchCode} language="javascript" />
      </section>

      {/* 3.3 JSON Manipulation for Industrial Data */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-sm font-black border border-indigo-500/40">3</span>
          3.3 การจัดการและแปลงข้อมูล JSON สำหรับกราฟและสถิติโรงงาน
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          ข้อมูลที่ได้รับจาก API ของระบบ MES หรือเซนเซอร์หน้างานจะมาในรูปแบบของ JSON (Key-Value, Nested Objects, และ Array). 
          นักพัฒนาต้องมีความเชี่ยวชาญในการใช้ฟังก์ชันชั้นสูงอย่าง <code>map()</code>, <code>filter()</code>, 
          และ <code>reduce()</code> เพื่อแปลงข้อมูลดิบให้กลายเป็นชุดข้อมูลที่พร้อมวาดกราฟหรือจัดตาราง:
        </p>

        <CodeBlock code={sampleJsonCode} language="javascript" />
      </section>
    </div>
  );
}

// =========================================================================
// MODULE 4: Application Integration & IoT Connectivity
// =========================================================================
export function EnterpriseAppMod4() {
  const webhookCode = `// ตัวอย่าง: การส่งแจ้งเตือนเครื่องจักรหยุดฉุกเฉิน (Andon Critical Alert) เข้า Telegram Bot
async function triggerTelegramAndonAlert(machineCode, reason, durationMin) {
  const BOT_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN';
  const CHAT_ID = '-1001234567890'; // Maintenance Group ID

  const messageText = \`🚨 *CRITICAL MACHINE BREAKDOWN* 🚨
------------------------------------
📍 *Machine:* \${machineCode}
⚠️ *Alarm Reason:* \${reason}
⏱️ *Downtime:* \${durationMin} นาที
👤 *Operator:* Somchai P. (Shift A)
------------------------------------
👉 กรุณาเข้าตรวจสอบหน้างานด่วน!\`;

  try {
    const res = await fetch(\`https://api.telegram.org/bot\${BOT_TOKEN}/sendMessage\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: messageText,
        parse_mode: 'Markdown'
      })
    });
    const result = await res.json();
    return result.ok;
  } catch (err) {
    console.error('Notification dispatch failed:', err);
    return false;
  }
}`;

  return (
    <div className="space-y-8 text-slate-200">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-teal-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-emerald-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-3 border border-emerald-500/30">
          <FiActivity className="w-4 h-4" /> โมดูลที่ 4 (Module 4)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          Application Integration &amp; IoT Connectivity
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การเชื่อมต่อแอปพลิเคชันเข้ากับอุปกรณ์ IoT/IIoT, ระบบควบคุม PLC และแพลตฟอร์มแจ้งเตือนภายนอก 
          (Telegram / Microsoft Teams) ผ่าน RESTful APIs และ Webhook อัตโนมัติ
        </p>
      </div>

      {/* 4.1 RESTful APIs & Industrial Communication */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center text-sm font-black border border-emerald-500/40">1</span>
          4.1 สถาปัตยกรรม RESTful API และโปรโตคอลการสื่อสารในโรงงาน
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          ในโรงงานอัจฉริยะ การรับส่งข้อมูลระหว่างเครื่องจักรและแอปพลิเคชันใช้โปรโตคอลที่หลากหลายตามระดับความเร็วที่ต้องการ:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-emerald-300 text-sm">HTTP / RESTful API</h3>
            <p className="text-slate-400 leading-relaxed">
              ใช้สำหรับการบันทึกยอดชิ้นงาน, การยืนยันใบสั่งผลิต (Job Order), และการดึงรายงานประวัติย้อนหลัง 
              ทำงานแบบ Request-Response ผ่านมาตรฐาน JSON
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-teal-300 text-sm">MQTT (Publish/Subscribe)</h3>
            <p className="text-slate-400 leading-relaxed">
              โปรโตคอลน้ำหนักเบาสำหรับส่งข้อมูลเซนเซอร์อุณหภูมิ, ความดัน, แรงสั่นสะเทือนแบบ Telemetry 
              ประหยัดแบนด์วิดท์เครือข่ายอย่างมาก
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-cyan-300 text-sm">WebSocket</h3>
            <p className="text-slate-400 leading-relaxed">
              การเชื่อมต่อสองทางแบบ Real-time ค้างไว้ สำหรับการทำหน้าจอ Digital Andon Board 
              หรือหน้าจอมอนิเตอร์สถานะเครื่องจักรที่มีการอัปเดตทุกๆ เสี้ยววินาที
            </p>
          </div>
        </div>
      </section>

      {/* 4.2 Machine Telemetry Pipeline */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-teal-600/30 text-teal-400 flex items-center justify-center text-sm font-black border border-teal-500/40">2</span>
          4.2 ขั้นตอนการดึงข้อมูลจากเครื่องจักรสู่เว็บ (Shop Floor to Web Pipeline)
        </h2>
        
        {/* Pipeline Step Sequence */}
        <div className="space-y-3 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-start gap-3">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-xs">Step 1</span>
            <div>
              <h3 className="text-sm font-bold text-white m-0">สัญญาณจากเซนเซอร์ &amp; PLC</h3>
              <p className="text-xs text-slate-300 m-0 mt-0.5">เซนเซอร์ Photoelectric จับชิ้นงานผ่าน ส่งพัลส์ 24VDC เข้า Input โมดูลของ PLC</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-start gap-3">
            <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold text-xs">Step 2</span>
            <div>
              <h3 className="text-sm font-bold text-white m-0">Edge Gateway / Node-RED</h3>
              <p className="text-xs text-slate-300 m-0 mt-0.5">อ่านค่าจาก Data Memory ของ PLC ผ่านโปรโตคอล MC Protocol / Modbus TCP ทุกๆ 1 วินาที</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-start gap-3">
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-xs">Step 3</span>
            <div>
              <h3 className="text-sm font-bold text-white m-0">MES Ingestion Webhook</h3>
              <p className="text-xs text-slate-300 m-0 mt-0.5">Node-RED ยิง HTTP POST JSON เข้ามายัง Web API เพื่อบันทึกลงฐานข้อมูล SQL Server</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-start gap-3">
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold text-xs">Step 4</span>
            <div>
              <h3 className="text-sm font-bold text-white m-0">Real-Time UI Update</h3>
              <p className="text-xs text-slate-300 m-0 mt-0.5">หน้าเว็บ React รับข้อมูลอัปเดต และคำนวณ OEE หรือแจ้งเตือนพนักงานแบบทันที</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4.3 Notification System Integration */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center text-sm font-black border border-emerald-500/40">3</span>
          4.3 การบูรณาการระบบแจ้งเตือนฉุกเฉิน (Telegram &amp; Teams Webhook Integration)
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          เมื่อเครื่องจักรเกิดปัญหาขัดข้อง (Critical Alarm หรือหยุดเกิน 5 นาที) ระบบจะทริกเกอร์ 
          <strong>Trigger-based Workflow</strong> เพื่อยิงแจ้งเตือนตรงไปยังทีมช่างซ่อมบำรุงหรือผู้จัดการผ่าน Telegram / MS Teams:
        </p>

        <CodeBlock code={webhookCode} language="javascript" />
      </section>
    </div>
  );
}

// =========================================================================
// MODULE 5: Software Testing, QA Standards & Deployment
// =========================================================================
export function EnterpriseAppMod5() {
  return (
    <div className="space-y-8 text-slate-200">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-amber-950/70 via-orange-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-amber-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-3 border border-amber-500/30">
          <FiShield className="w-4 h-4" /> โมดูลที่ 5 (Module 5)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          Software Testing, QA Standards, Security &amp; Deployment
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          กระบวนการทดสอบระบบซอฟต์แวร์โรงงานอย่างเป็นขั้นตอน: การเขียน Test Cases, การทดสอบระดับ UAT, 
          การจัดทำคู่มือและเอกสารทางเทคนิค, และมาตรฐานความปลอดภัยไซเบอร์ (Cybersecurity &amp; PDPA)
        </p>
      </div>

      {/* 5.1 Test Case Design */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-amber-600/30 text-amber-400 flex items-center justify-center text-sm font-black border border-amber-500/40">1</span>
          5.1 การออกแบบกรณีทดสอบระบบอุตสาหกรรม (Test Case Design &amp; Boundary Analysis)
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          ในระบบผลิต ข้อผิดพลาดของซอฟต์แวร์อาจนำไปสู่ความสูญเสียทางมูลค่ามหาศาลหรือเกิดอุบัติเหตุ การออกแบบ Test Cases จึงต้องทดสอบ 3 มิติหลัก:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-700 rounded-xl overflow-hidden">
            <thead className="bg-slate-800 text-slate-300 font-bold uppercase">
              <tr>
                <th className="p-3 border-b border-slate-700">ประเภทการทดสอบ</th>
                <th className="p-3 border-b border-slate-700">กรณีตัวอย่าง (Example Case)</th>
                <th className="p-3 border-b border-slate-700">ผลลัพธ์ที่คาดหวัง (Expected Result)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 font-bold text-emerald-400">1. Normal Case</td>
                <td className="p-3">คีย์ยอดผลิต 50 ชิ้น ใน Lot ที่มีเป้าหมาย 100 ชิ้น</td>
                <td className="p-3">บันทึกสำเร็จ ยอดผลิตคงเหลือปรับเป็น 50 ชิ้น</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 font-bold text-amber-400">2. Boundary Case</td>
                <td className="p-3">คีย์ยอดผลิต 100 ชิ้น (ชนขอบจำกัด Lot พอดี) หรือคีย์ 0 ชิ้น</td>
                <td className="p-3">ระบบคำนวณถูกต้อง สถานะเปลี่ยนเป็น Lot Closed</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 font-bold text-rose-400">3. Negative / Error Case</td>
                <td className="p-3">คีย์ยอดติดลบ (-5), คีย์ตัวอักษร "ABC", หรือสแกน QR ผิดรุ่น</td>
                <td className="p-3">ระบบปฏิเสธคำขอ แสดงคำเตือนชัดเจน ไม่ให้ข้อมูลขยะเข้า DB</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 font-bold text-purple-400">4. Network Drop Case</td>
                <td className="p-3">กดบันทึกขณะที่สาย LAN หรือสัญญาณ Wi-Fi หลุดกะทันหัน</td>
                <td className="p-3">แสดงสถานะ Offline แจ้งพนักงาน ห้ามค้างหน้าจอขาว</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 5.2 User Acceptance Testing (UAT) */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-orange-600/30 text-orange-400 flex items-center justify-center text-sm font-black border border-orange-500/40">2</span>
          5.2 การทดสอบยอมรับของผู้ใช้งานจริง (UAT &amp; Feedback Loop)
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          ก่อนปล่อยใช้งานจริง (Go-Live) ต้องเปิดรอบ <strong>UAT (User Acceptance Testing)</strong> ให้ช่างเทคนิค 
          หัวหน้ากะ และผู้จัดการทดลองใช้งานบนเครื่องจักรจริงเป็นเวลาอย่างน้อย 3–5 วัน:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-orange-300 text-sm">การจัดลำดับความรุนแรงของข้อบกพร่อง (Defect Severity)</h3>
            <ul className="text-slate-300 space-y-1.5 list-disc list-inside">
              <li><strong className="text-rose-400">Critical (Blocker):</strong> ไลน์การผลิตต้องหยุด, ข้อมูลชิ้นงานสูญหาย — ต้องแก้ไขทันทีก่อน Go-Live</li>
              <li><strong className="text-amber-400">Major:</strong> ฟังก์ชันทำงานผิด แต่ยังมีวิธีหลีกเลี่ยง (Workaround) ชั่วคราวได้</li>
              <li><strong className="text-sky-400">Minor / Cosmetic:</strong> ฟอนต์เยื้อง สีไม่ตรง หรือคำอธิบายสะกดผิด</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-emerald-300 text-sm">เกณฑ์การอนุมัติปล่อยใช้งาน (Sign-Off Criteria)</h3>
            <ul className="text-slate-300 space-y-1.5 list-disc list-inside">
              <li>ข้อบกพร่องระดับ Critical และ Major ต้องถูกปิด (Resolved) 100%</li>
              <li>ผู้แทนฝ่ายผลิตและฝ่ายคุณภาพ (QA) ลงนามอนุมัติเอกสาร UAT Sign-off</li>
              <li>พนักงานประจำเครื่องทุกคนผ่านการอบรมขั้นตอนการใช้งานเรียบร้อย</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5.3 Industrial Cybersecurity & PDPA */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-amber-600/30 text-amber-400 flex items-center justify-center text-sm font-black border border-amber-500/40">3</span>
          5.3 ความมั่นคงปลอดภัยไซเบอร์ในโรงงาน (Cybersecurity, Access Control &amp; PDPA)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-amber-300 text-sm">CSRF &amp; Injection Defense</h3>
            <p className="text-slate-400 leading-relaxed">
              ทุกคำสั่งแก้ไขข้อมูลต้องตรวจสอบ CSRF Token เสมอ และการติดต่อฐานข้อมูลต้องใช้ Prepared Statements 
              เพื่อป้องกัน SQL Injection 100%
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-sky-300 text-sm">Role-Based Access (RBAC)</h3>
            <p className="text-slate-400 leading-relaxed">
              แบ่งสิทธิ์การทำงานอย่างเข้มงวด: Operator คีย์ยอดผลิตได้เท่านั้น, Supervisor อนุมัติของเสียได้, 
              และมีเพียง Admin/Manager เท่านั้นที่เข้าถึงเมนูประเมินเกรดและต้นทุน
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-rose-300 text-sm">PDPA &amp; Client Storage</h3>
            <p className="text-slate-400 leading-relaxed">
              ห้ามเก็บข้อมูลเงินเดือน ผลประเมินเกรด หรือข้อมูลลับของโรงงานไว้ใน localStorage บนมือถือพนักงาน (BYOD) 
              เพื่อป้องกันข้อมูลรั่วไหลเมื่อโทรศัพท์สูญหาย
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

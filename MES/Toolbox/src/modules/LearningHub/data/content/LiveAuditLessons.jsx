import React from 'react';
import { FiAlertOctagon, FiAlertTriangle, FiCheckCircle, FiShield, FiFileText, FiAward } from 'react-icons/fi';

export function LiveAuditFindingsLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-red-900/50 to-rose-900/50 p-8 rounded-2xl border border-rose-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-rose-500/20 text-rose-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Live Case Study</span>
          <span className="text-slate-400 text-sm">Audited: 4-5 Aug 2026</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-amber-300 mt-0 mb-4">
          ถอดบทเรียนการตรวจประเมินจริง ส.ค. 2569 (Score 93.9% Grade A)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          บทเรียนจากรายงานการตรวจประเมินจริงฉบับเต็มของ <strong>Infinity Parts (IPC / SNC Group)</strong> โดย Lead Auditor คุณตรีลักษณ์ วงศ์ขจิต ซึ่งได้รับคะแนน 200/213 (เกรด A) แต่มีจุดที่ถูกติงหน้างาน 11 รายการ
        </p>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <FiAlertOctagon className="text-rose-400" /> 3 จุดตกม้าตายหน้างานจริงที่พนักงานมักมองข้าม
        </h3>
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 rounded-lg border-l-4 border-rose-500">
            <strong className="text-rose-400 block mb-1">1. เครื่องเจาะ CNC ไม่เช็คชื่อโปรแกรม</strong>
            <span className="text-sm text-slate-300">พนักงานชิ้นงาน Guide Plate ไม่ได้เทียบชื่อโปรแกรมบนหน้าจอกับใบสั่งผลิตก่อนกดเริ่มเครื่อง เสี่ยงต่อการรันชิ้นงานผิดแบบยกกะ</span>
          </div>
          <div className="p-4 bg-slate-900 rounded-lg border-l-4 border-amber-500">
            <strong className="text-amber-400 block mb-1">2. เครื่องปั๊ม Stamping ไม่จดค่า Die Height และ QC ไม่เซ็นชิ้นแรก</strong>
            <span className="text-sm text-slate-300">พนักงานขึ้นรูปแผ่นเหล็ก Rear Gable ไม่ได้บันทึกค่าความสูงปิดของแม่พิมพ์ และ QC ไม่ได้มาตรวจยืนยันชิ้นแรกก่อนเดินเครื่อง</span>
          </div>
          <div className="p-4 bg-slate-900 rounded-lg border-l-4 border-yellow-500">
            <strong className="text-yellow-400 block mb-1">3. พนักงานลงบันทึกเท็จโดยไม่รู้ตัว (Blind Record)</strong>
            <span className="text-sm text-slate-300">พนักงานคุมระบบน้ำ RO ไลน์พ่นสี กรอกตัวเลขใน Check Sheet ครบถ้วน แต่เมื่อผู้ตรวจถามวิธีการวัดและเกณฑ์ กลับไม่สามารถอธิบายได้</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LiveNcrCaseStudyLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-orange-900/50 to-amber-900/50 p-8 rounded-2xl border border-orange-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-orange-500/20 text-orange-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">NCR Case Study</span>
          <span className="text-slate-400 text-sm">Real Defect 2026</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300 mt-0 mb-4">
          กรณีศึกษาของเสียจริง 26-NCR-001 (ชิ้นงานผลิตผิด Revision)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          กรณีศึกษาการเกิดของเสียจริงในชิ้นส่วน <strong>COMPRESSOR SUPPORT V5VM (00U073700120)</strong> ที่ผลิตผิด Revision ส่งผลให้เกิดการกักกันสินค้า 1,200 ชิ้น และการปรับปรุงระบบ MES Interlock
        </p>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-2">การแก้ปัญหาเชิงระบบด้วย MES Digital Interlock</h3>
        <p className="text-sm text-slate-300 mb-4 leading-relaxed">
          เปลี่ยนจากการพึ่งพาการแจกจ่ายแบบกระดาษ มาเป็นการล็อกผ่านระบบ MES: เครื่องจักร CNC จะไม่สามารถดาวน์โหลดไฟล์โปรแกรมตัดหรือเจาะได้ หากหมายเลข Revision ของไฟล์ไม่ตรงกับใบสั่งผลิต (Work Order) ในระบบ ERP 100%
        </p>
      </div>
    </div>
  );
}

export function LiveWalmartFccaLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 p-8 rounded-2xl border border-blue-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Retailer FCCA</span>
          <span className="text-slate-400 text-sm">Intertek Audit</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 mt-0 mb-4">
          เกณฑ์ตรวจห้าง Walmart FCCA by Intertek &amp; Transit Test ISTA
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          มาตรฐานการประเมินกำลังการผลิตและคุณภาพของห้าง Walmart และ The Home Depot (Intertek FCCA v3.0 ครบ 10 หมวด) พร้อมผลทดสอบกล่อง Transit Test ตามมาตรฐาน ISTA 1A/3A
        </p>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-2">หัวใจสำคัญของ Walmart FCCA</h3>
        <ul className="text-sm text-slate-300 space-y-2">
          <li>• <strong>ความเป็นอิสระของ QC (Critical):</strong> ฝ่าย QC ต้องรายงานตรงต่อ MD เพื่อป้องกันไม่ให้ฝ่ายผลิตบังคับปล่อยงานเสีย</li>
          <li>• <strong>Lacey Act Compliance:</strong> ตรวจสอบย้อนกลับแหล่งกำเนิดไม้ยางพาราถูกกฎหมายจาก BNS Wood</li>
          <li>• <strong>CARB ATCM Phase 2:</strong> ผลตรวจวัดการปล่อยก๊าซฟอร์มาลดีไฮด์ในชิ้นส่วนไม้ประกอบ</li>
        </ul>
      </div>
    </div>
  );
}

export function LiveConflictMineralsLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-amber-900/50 to-yellow-900/50 p-8 rounded-2xl border border-amber-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Supply Chain Ethics</span>
          <span className="text-slate-400 text-sm">Dodd-Frank Act Sec.1502</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300 mt-0 mb-4">
          นโยบายแร่ที่มีข้อขัดแย้ง (Conflict Minerals 3TG) &amp; CMRT
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          การควบคุมแร่ 4 ชนิด (Tin, Tantalum, Tungsten, Gold) ไม่ให้มาจากเหมืองที่สนับสนุนสงครามในสาธารณรัฐประชาธิปไตยคองโก (DRC) ผ่านแบบฟอร์ม CMRT และการตรวจสอบโรงถลุงแร่ RMI
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
          <strong className="text-amber-400 block text-lg mb-1">Tin (Sn)</strong>
          <span className="text-xs text-slate-300">ลวดบัดกรีแผงวงจร</span>
        </div>
        <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
          <strong className="text-amber-400 block text-lg mb-1">Tantalum (Ta)</strong>
          <span className="text-xs text-slate-300">ตัวเก็บประจุวงจร</span>
        </div>
        <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
          <strong className="text-amber-400 block text-lg mb-1">Tungsten (W)</strong>
          <span className="text-xs text-slate-300">หน้าสัมผัสสวิตช์ไฟฟ้า</span>
        </div>
        <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
          <strong className="text-amber-400 block text-lg mb-1">Gold (Au)</strong>
          <span className="text-xs text-slate-300">ชุบขั้วต่อสัญญาณ</span>
        </div>
      </div>
    </div>
  );
}

export function LiveEcoFactoryLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 p-8 rounded-2xl border border-emerald-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Green Decarbonization</span>
          <span className="text-slate-400 text-sm">Eco Factory &amp; GI3</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 mt-0 mb-4">
          มาตรฐานโรงงานเชิงนิเวศ (Eco Factory), GI3 &amp; iCarbon Credit
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          การรับรองโรงงานเชิงนิเวศ 5 มิติจาก กนอ. และสภาอุตสาหกรรมฯ, อุตสาหกรรมสีเขียวระดับ 3 (GI3), บัญชีก๊าซเรือนกระจก Scope 1, 2, 3 และผลตรวจวัดมลพิษอากาศ/น้ำทิ้งตามกฎหมาย
        </p>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-2">การควบคุมมลพิษและของเสียตามกฎหมาย</h3>
        <p className="text-sm text-slate-300">รายงานผลตรวจวัดคุณภาพอากาศจากปล่องระบายห้องพ่นสี (ฝุ่น TSP, SO2, NOx, VOCs) และผลตรวจวิเคราะห์น้ำทิ้งอุตสาหกรรม ณ 30.06.69 ผ่านเกณฑ์มาตรฐาน 100% พร้อมใบกำกับกากของเสียอันตราย (กอ.1 / สก.2) อิเล็กทรอนิกส์</p>
      </div>
    </div>
  );
}

export function LiveDefectParetoLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-violet-900/50 to-indigo-900/50 p-8 rounded-2xl border border-violet-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-violet-500/20 text-violet-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Failure Prevention</span>
          <span className="text-slate-400 text-sm">600+ CAR Archive</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-300 mt-0 mb-4">
          พาเรโตของเสียจากประวัติ CAR 600 เคส และ Q-Points เฉพาะลูกค้า
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          การวิเคราะห์ของเสียเรื้อรัง (รั่วซึม 35%, ผิด Revision 22%, ประกอบไม่ครบ 18%, รอยขูดขีด 15%, บาร์โค้ดไม่ติด 10%), Q-Points ลูกค้ารายใหญ่ (Fujitsu, Midea, Daikin, SCI) และขั้นตอน 8D Report
        </p>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">จุดควบคุมคุณภาพเฉพาะลูกค้ารายใหญ่</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-slate-900 rounded-lg"><strong>Fujitsu General:</strong> ทอร์กบานแฟร์, ความต้านทานฉนวน &gt; 100 MΩ, และผลทดสอบแล็บ SGS (AOMA18FUTA)</div>
          <div className="p-3 bg-slate-900 rounded-lg"><strong>Midea:</strong> ตรวจเกลียวน็อตสกรูด้วย Go/No-Go Gauge และความหนาชั้นชุบซิงค์</div>
          <div className="p-3 bg-slate-900 rounded-lg"><strong>Daikin:</strong> ความสะอาดภายในท่อ &lt; 5 mg/m² และแรงดัดท่อปราศจากรอยย่น</div>
          <div className="p-3 bg-slate-900 rounded-lg"><strong>SCI (Mitsubishi):</strong> ทดสอบแรงอัดระเบิด Burst Pressure &gt; 3.5 เท่า และความต้านทานแรงสั่นสะเทือน</div>
        </div>
      </div>
    </div>
  );
}

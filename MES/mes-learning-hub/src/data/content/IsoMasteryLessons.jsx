import React from 'react';
import { 
  FiShield, 
  FiCheckCircle, 
  FiFileText, 
  FiActivity, 
  FiLayers, 
  FiAlertTriangle, 
  FiTarget, 
  FiAward,
  FiSliders,
  FiCpu,
  FiZap,
  FiTool
} from 'react-icons/fi';

// ==========================================
// 1. ISO 9001:2015 Quality Management System
// ==========================================

export function Iso9001HlsLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 p-8 rounded-2xl border border-blue-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Quality Management</span>
          <span className="text-slate-400 text-sm">ISO 9001:2015 · Module 1</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 mt-0 mb-4">
          โครงสร้าง HLS, บริบทองค์กร (Clause 4) และการเป็นผู้นำ (Clause 5)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          เรียนรู้โครงสร้างมาตรฐานระดับสูง (High-Level Structure: 10 Clauses), การวิเคราะห์บริบทภายใน-ภายนอก (SWOT / PESTEL), การตอบสนองความคาดหวังของผู้มีส่วนได้ส่วนเสีย และบทบาทผู้นำในการขับเคลื่อนนโยบายคุณภาพ
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <FiLayers className="text-blue-400" /> โครงสร้าง High-Level Structure (HLS 10 Clauses)
          </h3>
          <ul className="text-sm text-slate-300 space-y-2">
            <li>• <strong>Clause 1 - 3:</strong> ขอบข่าย, เอกสารอ้างอิง, คำศัพท์และนิยาม</li>
            <li>• <strong>Clause 4 (Context):</strong> สภาพแวดล้อมองค์กร และผู้มีส่วนได้ส่วนเสีย</li>
            <li>• <strong>Clause 5 (Leadership):</strong> ความมุ่งมั่นของฝ่ายบริหาร และนโยบายคุณภาพ</li>
            <li>• <strong>Clause 6 (Planning):</strong> การประเมินความเสี่ยงและวัตถุประสงค์คุณภาพ</li>
            <li>• <strong>Clause 7 (Support):</strong> ทรัพยากร, บุคลากร, เครื่องมือวัด และ DCC</li>
            <li>• <strong>Clause 8 (Operation):</strong> วางแผน ผลิต ตรวจสอบ และส่งมอบ</li>
            <li>• <strong>Clause 9 (Performance):</strong> ตรวจติดตามภายใน และ Management Review</li>
            <li>• <strong>Clause 10 (Improvement):</strong> การแก้ปัญหา NC และ CAPA 8D</li>
          </ul>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <FiTarget className="text-emerald-400" /> ผังกระบวนการแบบเต่า (Turtle Diagram)
          </h3>
          <p className="text-xs text-slate-400 mb-3">เครื่องมือวิเคราะห์กระบวนการตามข้อกำหนด Clause 4.4 ที่ Auditor ทุกสำนักเรียกตรวจ</p>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 bg-slate-900 rounded-lg"><strong className="text-blue-300">With What (เครื่องมือ/อุปกรณ์):</strong> เครื่องจักร, ซอฟต์แวร์ MES, อุปกรณ์สอบเทียบ</div>
            <div className="p-2.5 bg-slate-900 rounded-lg"><strong className="text-cyan-300">With Who (ผู้รับผิดชอบ):</strong> พนักงานที่ผ่านการฝึกอบรม, วิศวกร, ผู้ควบคุมเครื่อง</div>
            <div className="p-2.5 bg-slate-900 rounded-lg"><strong className="text-purple-300">How (วิธีการปฏิบัติ):</strong> Control Plan, WI, Drawing, มาตรฐานการทำงาน</div>
            <div className="p-2.5 bg-slate-900 rounded-lg"><strong className="text-amber-300">KPIs (เกณฑ์ชี้วัด):</strong> FPY ≥ 99.5%, OEE ≥ 85%, Zero Customer Claim</div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/80 p-6 rounded-xl border-l-4 border-blue-500">
        <h4 className="text-white font-bold mb-1">Auditor Defense Tip (Clause 5 Leadership):</h4>
        <p className="text-sm text-slate-300 m-0">
          เมื่อผู้ตรวจสุ่มถามผู้บริหารหรือหัวหน้างาน: "นโยบายคุณภาพคืออะไรและพนักงานนำไปปฏิบัติอย่างไร?" ห้ามท่องจำคำขวัญ แต่ให้อธิบายว่านโยบายถูกแปลงเป็น KPI ประจำหน่วยงาน (เช่น อัตราของเสียลดลง 2%, ส่งมอบตรงเวลา 100%) และพนักงานในไลน์ตรวจสอบชิ้นงานตามเกณฑ์อย่างไร
        </p>
      </div>
    </div>
  );
}

export function Iso9001RiskLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 p-8 rounded-2xl border border-blue-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Quality Management</span>
          <span className="text-slate-400 text-sm">ISO 9001:2015 · Module 2</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 mt-0 mb-4">
          การบริหารความเสี่ยงและโครงสร้างสนับสนุน (Clause 6 & 7)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          แนวคิดเชิงความเสี่ยง (Risk-Based Thinking), ทะเบียนความเสี่ยงและโอกาส, ระบบควบคุมเอกสารสารสนเทศ DCC (`SP-DCC-001`), การสอบเทียบเครื่องมือวัดตามข้อกำหนด 7.1.5 และการประเมิน Competence พนักงาน
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <FiAlertTriangle className="text-amber-400" /> การประเมินความเสี่ยงและโอกาส (Risk Register)
          </h3>
          <p className="text-sm text-slate-300 mb-3">คำนวณตามสูตรระดับความเสี่ยง: <code>Risk Level = Severity × Likelihood</code></p>
          <ul className="text-xs text-slate-300 space-y-2">
            <li>• <strong>Low Risk (1-4):</strong> ยอมรับได้ เฝ้าระวังในการทำงานประจำวัน</li>
            <li>• <strong>Medium Risk (5-9):</strong> ต้องมีมาตรการป้องกันและทบทวนทุกไตรมาส</li>
            <li>• <strong>High Risk (10-25):</strong> ต้องจัดทำ Action Plan เร่งด่วนเพื่อลดผลกระทบ</li>
          </ul>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <FiFileText className="text-cyan-400" /> ระเบียบควบคุมเอกสาร DCC (`SP-DCC-001`)
          </h3>
          <ul className="text-xs text-slate-300 space-y-2">
            <li>• เอกสารฉบับแจกจ่ายใช้งานจริงต้องมีตราประทับหมึกแดง <strong>"CONTROLLED DOCUMENT"</strong></li>
            <li>• เอกสารยกเลิกต้องเรียกเก็บคืน 100% พร้อมประทับตรา <strong>"OBSOLETE"</strong></li>
            <li>• ห้ามมีเอกสารเขียนด้วยลายมือหรือชีทงานที่ไม่ผ่านการควบคุมของ DCC แขวนในไลน์ผลิตเด็ดขาด</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function Iso9001OperationsLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 p-8 rounded-2xl border border-blue-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Quality Management</span>
          <span className="text-slate-400 text-sm">ISO 9001:2015 · Module 3</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 mt-0 mb-4">
          การควบคุมการปฏิบัติการและการตรวจสอบย้อนกลับ (Clause 8)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          การวางแผนกระบวนการผลิต, การตรวจสอบชิ้นแรก (First Piece Inspection), ระบบการชี้บ่งและสืบย้อนกลับ (Traceability), และการควบคุมผลผลิตที่ไม่เป็นไปตามข้อกำหนด (`SP-QCS-003`)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h4 className="text-white font-bold mb-2 text-sm">First Piece Approval</h4>
          <p className="text-xs text-slate-300">ก่อนเริ่มเดินเครื่องจักรทุกกะหรือหลังเปลี่ยนแม่พิมพ์/วัสดุ ต้องให้ QC ตรวจวัดขนาดสำคัญ (CTQ) ครบถ้วนและลงนามอนุมัติก่อนเดินผลิตจริง 100%</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h4 className="text-white font-bold mb-2 text-sm">Identification & Traceability</h4>
          <p className="text-xs text-slate-300">ชิ้นงานทุกพาเลทต้องมีป้ายชี้บ่งระบุ Part No., Lot No., วันเวลา และชื่อผู้ผลิต สามารถสืบย้อนกลับหาล็อตวัตถุดิบและผลการตรวจสอบได้ภายใน 2 ชั่วโมง</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h4 className="text-white font-bold mb-2 text-sm">Non-conforming Outputs</h4>
          <p className="text-xs text-slate-300">เมื่อพบชิ้นงานเสีย (NG) ต้องติดแท็กแดง "HOLD" ทันที และย้ายเข้าสู่กรงกักกันที่มีกุญแจล็อกเพื่อป้องกันการปะปนกับงานดี</p>
        </div>
      </div>
    </div>
  );
}

export function Iso9001AuditCapaLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 p-8 rounded-2xl border border-blue-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Quality Management</span>
          <span className="text-slate-400 text-sm">ISO 9001:2015 · Module 4</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 mt-0 mb-4">
          การประเมินสมรรถนะ การตรวจประเมินภายใน และ CAPA (Clause 9 & 10)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          การวางแผนตรวจประเมินภายในประจำปี (`FM-DCC-003`), การประชุมทบทวนของฝ่ายบริหาร (Management Review `SP-MRS-001`), การแก้ไขและป้องกันข้อบกพร่องตามแบบฟอร์ม 8D CAR
        </p>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-3">กระบวนการปิด CAR 8D ให้ผ่านการรับรอง</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-900 rounded-lg"><strong>D1-D3 (24 ชม.):</strong> กักกันของเสีย สต็อก และล็อตต้องสงสัยทั้งหมด</div>
          <div className="p-3 bg-slate-900 rounded-lg"><strong>D4 (7 วัน):</strong> สกัดสาเหตุรากเหง้าด้วย Fishbone + 5-Why Analysis</div>
          <div className="p-3 bg-slate-900 rounded-lg"><strong>D5-D6 (14 วัน):</strong> กำหนดมาตรการแก้ไขถาวรและลงมือปฏิบัติจริง</div>
          <div className="p-3 bg-slate-900 rounded-lg"><strong>D7-D8 (30 วัน):</strong> ปรับปรุง Control Plan/WI และตรวจติดตาม Zero Recurrence</div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. ISO 14001:2015 Environmental Management
// ==========================================

export function Iso14001ContextLegalLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 p-8 rounded-2xl border border-emerald-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Environmental Systems</span>
          <span className="text-slate-400 text-sm">ISO 14001:2015 · Module 1</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 mt-0 mb-4">
          บริบทสิ่งแวดล้อม นโยบาย และกฎหมายอุตสาหกรรม (Clause 4 & 5)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          การกำหนดนโยบายสิ่งแวดล้อม, การวิเคราะห์ความคาดหวังของชุมชนและหน่วยงานรัฐ, และการจัดทำทะเบียนกฎหมายสิ่งแวดล้อม (`ESP-DCO-001`) พร้อมการประเมินความสอดคล้อง 100%
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-2">นโยบายสิ่งแวดล้อม 3R</h3>
          <p className="text-sm text-slate-300">มุ่งเน้นการลดการใช้ทรัพยากร (Reduce), การนำกลับมาใช้ซ้ำ (Reuse), และการแปรใช้ใหม่ (Recycle) พร้อมคำมั่นสัญญาในการปฏิบัติตามกฎหมายและป้องกันมลพิษ</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-2">ทะเบียนกฎหมายสิ่งแวดล้อม (`ESP-DCO-001`)</h3>
          <p className="text-sm text-slate-300">รวบรวมกฎหมายกระทรวงอุตสาหกรรม, สาธารณสุข, และผังเมือง มีการประเมินความสอดคล้องอย่างน้อยปีละ 1 ครั้ง และอัปเดตกฎหมายใหม่ทุกเดือน</p>
        </div>
      </div>
    </div>
  );
}

export function Iso14001AspectsLifecycleLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 p-8 rounded-2xl border border-emerald-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Environmental Systems</span>
          <span className="text-slate-400 text-sm">ISO 14001:2015 · Module 2</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 mt-0 mb-4">
          การชี้บ่งประเด็นสิ่งแวดล้อมและมุมมองวงจรชีวิต (Clause 6)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          การประเมิน Aspects & Impacts ในสภาวะปกติ (Normal), ผิดปกติ (Abnormal), และฉุกเฉิน (Emergency) พร้อมมุมมองวงจรชีวิตผลิตภัณฑ์ (Life Cycle Perspective: LCP)
        </p>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-3">วงจรชีวิตผลิตภัณฑ์ (Life Cycle Perspective)</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-900 rounded-lg"><strong>1. จัดซื้อวัตถุดิบ:</strong> ตรวจสอบสาร RoHS / REACH และการไม่ใช้แร่ขัดแย้ง 3TG</div>
          <div className="p-3 bg-slate-900 rounded-lg"><strong>2. กระบวนการผลิต:</strong> ลดการใช้พลังงานไฟฟ้า ประหยัดน้ำมัน และลดกากเคมี</div>
          <div className="p-3 bg-slate-900 rounded-lg"><strong>3. บรรจุภัณฑ์ & ขนส่ง:</strong> ใช้ลังพลาสติกหมุนเวียน และจัดเที่ยวรถเต็มคัน</div>
          <div className="p-3 bg-slate-900 rounded-lg"><strong>4. ซากหลังหมดอายุ:</strong> ออกแบบให้แยกชิ้นส่วนและรีไซเคิลได้ง่าย (Design for Recycling)</div>
        </div>
      </div>
    </div>
  );
}

export function Iso14001WasteChemicalLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 p-8 rounded-2xl border border-emerald-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Environmental Systems</span>
          <span className="text-slate-400 text-sm">ISO 14001:2015 · Module 3</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 mt-0 mb-4">
          การจัดการของเสีย สารเคมี และ Eco-Factory (Clause 8.1)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          การควบคุมกากของเสียอันตรายและไม่อันตราย, การจัดเก็บสารเคมีตามระบบ Secondary Containment 110%, การติดป้าย GHS/SDS และการขออนุญาตนำสิ่งปฏิกูลออกนอกโรงงาน (กอ.1 / สก.2)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h4 className="text-white font-bold mb-2 text-sm">Secondary Containment 110%</h4>
          <p className="text-xs text-slate-300">ถังสารเคมีและน้ำมันทุกถังต้องวางบนถาดรองรับความจุไม่น้อยกว่า 110% ของถังที่ใหญ่ที่สุดเพื่อป้องกันการรั่วไหลลงสู่ดินและรางระบายน้ำ</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h4 className="text-white font-bold mb-2 text-sm">กากของเสีย กอ.1 / สก.2</h4>
          <p className="text-xs text-slate-300">การนำกากของเสียออกนอกโรงงานต้องยื่นขออนุญาตผ่านระบบอิเล็กทรอนิกส์ กรมโรงงานฯ และผู้รับกำจัดต้องมีใบอนุญาต 101/105/106 ถูกต้อง</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h4 className="text-white font-bold mb-2 text-sm">Spill Kit & GHS</h4>
          <p className="text-xs text-slate-300">ภาชนะบรรจุสารเคมีทุกใบต้องมีป้ายเตือนตามระบบสากล GHS พร้อมติดตั้งชุดดูดซับสารเคมีฉุกเฉิน (Spill Kit) ในจุดใช้งาน</p>
        </div>
      </div>
    </div>
  );
}

export function Iso14001EmergencyAuditLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 p-8 rounded-2xl border border-emerald-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Environmental Systems</span>
          <span className="text-slate-400 text-sm">ISO 14001:2015 · Module 4</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 mt-0 mb-4">
          แผนซ้อมรับมือเหตุฉุกเฉินและการมุ่งสู่ Net Zero (Clause 8.2, 9 & 10)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          การฝึกซ้อมแผนระงับสารเคมีรั่วไหลและอัคคีภัย, การตรวจวัดคุณภาพสิ่งแวดล้อม (น้ำทิ้ง/อากาศ/เสียง), และการจัดทำบัญชีปล่อยก๊าซเรือนกระจกมุ่งสู่โรงงานสีเขียว (Eco-Factory)
        </p>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-2">การซ้อมแผนสารเคมีรั่วไหลฉุกเฉิน (Spill Drill)</h3>
        <p className="text-sm text-slate-300 mb-4">ต้องดำเนินการซ้อมอย่างน้อยปีละ 1 ครั้ง โดยจำลองสถานการณ์สารเคมีหกในปริมาณวิกฤต ทดสอบการแจ้งเหตุ การสวมใส่อุปกรณ์ PPE หน้ากากป้องกันไอระเหย การใช้ท่อนดูดซับล้อมกัก และการจัดเก็บขยะปนเปื้อน</p>
      </div>
    </div>
  );
}

// ==========================================
// 3. ISO 45001:2018 Occupational Health & Safety
// ==========================================

export function Iso45001LeadershipWorkerLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-amber-900/50 to-orange-900/50 p-8 rounded-2xl border border-amber-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Health & Safety</span>
          <span className="text-slate-400 text-sm">ISO 45001:2018 · Module 1</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-300 mt-0 mb-4">
          นโยบายความปลอดภัยและการมีส่วนร่วมของพนักงาน (Clause 4 & 5)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          นโยบาย Zero Accident, การจัดตั้งคณะกรรมการความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน (คปอ.), สิทธิในการหยุดงานเมื่อไม่ปลอดภัย (Stop Work Authority) และการปรึกษาหารือลูกจ้าง (5.4)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-2">คณะกรรมการ คปอ.</h3>
          <p className="text-sm text-slate-300">ประกอบด้วยตัวแทนนายจ้างและตัวแทนลูกจ้างในสัดส่วนที่เท่าเทียมกัน ประชุมตรวจติดตามสภาพแวดล้อมการทำงานทุกเดือน และนำข้อเสนอแนะของพนักงานไปแก้ไขทันที</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-2">Stop Work Authority (สิทธิหยุดงาน)</h3>
          <p className="text-sm text-slate-300">พนักงานทุกคนมีสิทธิและความรับผิดชอบในการสั่งหยุดงานทันทีหากพบสภาพแวดล้อมหรือขั้นตอนที่ไม่ปลอดภัย โดยไม่มีความผิดและไม่ถูกลงโทษทางวินัย</p>
        </div>
      </div>
    </div>
  );
}

export function Iso45001HazardHierarchyLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-amber-900/50 to-orange-900/50 p-8 rounded-2xl border border-amber-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Health & Safety</span>
          <span className="text-slate-400 text-sm">ISO 45001:2018 · Module 2</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-300 mt-0 mb-4">
          การชี้บ่งอันตรายและลำดับขั้นการควบคุม (Clause 6)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          การวิเคราะห์ความปลอดภัยในงาน (JSA / Job Safety Analysis) และการประเมินความเสี่ยง HIRA พร้อมการควบคุมตามหลัก Hierarchy of Controls 5 ระดับ
        </p>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">ลำดับขั้นการควบคุมอันตราย 5 ระดับ (Hierarchy of Controls)</h3>
        <div className="space-y-3">
          <div className="p-3 bg-slate-900 rounded-lg border-l-4 border-emerald-500">
            <strong className="text-emerald-400">1. Elimination (การกำจัด):</strong> เลิกใช้กระบวนการหรือเครื่องมือที่อันตรายโดยสิ้นเชิง (มีประสิทธิภาพสูงสุด)
          </div>
          <div className="p-3 bg-slate-900 rounded-lg border-l-4 border-cyan-500">
            <strong className="text-cyan-400">2. Substitution (การแทนที่):</strong> เปลี่ยนไปใช้สารเคมีสูตรน้ำที่ไม่ติดไฟแทนทินเนอร์
          </div>
          <div className="p-3 bg-slate-900 rounded-lg border-l-4 border-blue-500">
            <strong className="text-blue-400">3. Engineering Controls (การควบคุมทางวิศวกรรม):</strong> ติดตั้งการ์ดป้องกัน Safety Light Curtain, ระบบตัดไฟอัตโนมัติ
          </div>
          <div className="p-3 bg-slate-900 rounded-lg border-l-4 border-amber-500">
            <strong className="text-amber-400">4. Administrative Controls (การควบคุมทางการบริหาร):</strong> ใบอนุญาตทำงาน Work Permit, ป้ายเตือน, การสลับกะเพื่อลดความล้า
          </div>
          <div className="p-3 bg-slate-900 rounded-lg border-l-4 border-rose-500">
            <strong className="text-rose-400">5. PPE (อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคล):</strong> แว่นตานิรภัย, รองเท้าหัวเหล็ก, ที่อุดหูลดเสียง (เป็นปราการด่านสุดท้าย)
          </div>
        </div>
      </div>
    </div>
  );
}

export function Iso45001OperationsLotoLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-amber-900/50 to-orange-900/50 p-8 rounded-2xl border border-amber-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Health & Safety</span>
          <span className="text-slate-400 text-sm">ISO 45001:2018 · Module 3</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-300 mt-0 mb-4">
          การควบคุมความปลอดภัยหน้างาน LOTO & Work Permit (Clause 8.1)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          ระบบตัดแยกพลังงานอันตราย Lockout / Tagout (LOTO 6 ขั้นตอน), ระบบใบอนุญาตทำงานเสี่ยงสูง (Work Permit), และการตรวจประเมินจุดอันตรายเครื่องจักร
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-2">6 ขั้นตอนระบบ LOTO</h3>
          <ul className="text-xs text-slate-300 space-y-1.5">
            <li>1. แจ้งเตือนพนักงานที่เกี่ยวข้องในพื้นที่</li>
            <li>2. ปิดเครื่องจักรตามขั้นตอนปกติ</li>
            <li>3. ตัดแยกแหล่งพลังงาน (ไฟฟ้า ลม แรงดัน)</li>
            <li>4. คล้องกุญแจ Lockout และติดป้าย Tagout</li>
            <li>5. ระบายพลังงานสะสมที่ตกค้างออกให้หมด (Zero Energy)</li>
            <li>6. ทดสอบกดสวิตช์ยืนยันว่าเครื่องไม่ทำงาน (Zero Verification)</li>
          </ul>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-2">ระบบใบอนุญาตทำงานเสี่ยงสูง (Work Permit)</h3>
          <p className="text-xs text-slate-300 mb-2">งานที่มีความเสี่ยงสูงต้องมีใบอนุญาตก่อนเริ่มงาน 100%:</p>
          <ul className="text-xs text-slate-300 space-y-1.5">
            <li>• <strong>Hot Work:</strong> งานตัด เชื่อม เจียร ที่เกิดประกายไฟ</li>
            <li>• <strong>Confined Space:</strong> งานในที่อับอากาศ บ่อ ถัง หรือท่อระบาย</li>
            <li>• <strong>Work at Height:</strong> งานบนที่สูงตั้งแต่ 2 เมตรขึ้นไป</li>
            <li>• <strong>High Voltage:</strong> งานตัดต่อระบบตู้เมนไฟฟ้าแรงสูง</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function Iso45001EmergencyInvestigationLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-amber-900/50 to-orange-900/50 p-8 rounded-2xl border border-amber-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Health & Safety</span>
          <span className="text-slate-400 text-sm">ISO 45001:2018 · Module 4</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-300 mt-0 mb-4">
          แผนฉุกเฉิน การสืบสวนอุบัติเหตุ และ Near-Miss (Clause 8.2 & 10.2)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          การสืบสวนอุบัติการณ์, การรายงานเหตุการณ์เกือบเกิดอุบัติเหตุ (Near-Miss Incident), ทฤษฎีพีระมิดอุบัติเหตุ Heinrich's Triangle และการซ้อมแผนอพยพหนีไฟ
        </p>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-3">พีระมิดอุบัติเหตุของ Heinrich (Heinrich's Triangle 1 : 29 : 300)</h3>
        <p className="text-sm text-slate-300 mb-4">
          ทุกๆ 1 อุบัติเหตุร้ายแรงถึงขั้นสูญเสียอวัยวะหรือเสียชีวิต จะมีอุบัติเหตุเบา 29 ครั้ง และมีเหตุการณ์เกือบเกิดอุบัติเหตุ (Near-Miss) 300 ครั้ง ดังนั้นการกำจัดพฤติกรรมที่ไม่ปลอดภัยและแจ้งเตือน Near-Miss คือหัวใจของการป้องกันอุบัติเหตุใหญ่ 100%
        </p>
      </div>
    </div>
  );
}

// ==========================================
// 4. ISO/IEC 17025:2017 Laboratory Competence
// ==========================================

export function Iso17025GeneralStructureLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 p-8 rounded-2xl border border-purple-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-purple-500/20 text-purple-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Laboratory Competence</span>
          <span className="text-slate-400 text-sm">ISO/IEC 17025:2017 · Module 1</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300 mt-0 mb-4">
          ความเป็นกลาง การรักษาความลับ และโครงสร้างห้องแล็บ (Clause 4 & 5)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          ความเป็นกลางในการทดสอบ (Impartiality), สัญญาการรักษาความลับข้อมูลลูกค้า (`SP-LAB-001/002`), อำนาจอิสระของผู้จัดการแล็บ และโครงสร้างองค์กร QC Lab
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-2">ความเป็นกลาง (Impartiality)</h3>
          <p className="text-sm text-slate-300">บุคลากรห้องปฏิบัติการต้องไม่มีแรงกดดันทางการค้า การเงิน หรือแรงกดดันจากฝ่ายผลิตในการแก้ไขหรือเปลี่ยนแปลงผลการทดสอบเด็ดขาด ผลแล็บต้องสะท้อนค่าจริง 100%</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-2">การรักษาความลับ (Confidentiality)</h3>
          <p className="text-sm text-slate-300">ผลการทดสอบ สูตร และสเปกสินค้าของลูกค้าถือเป็นความลับทางการค้าขั้นสูงสุด ต้องลงนาม NDA และควบคุมการเข้าถึงด้วยระบบสิทธิ์ผ่าน MES</p>
        </div>
      </div>
    </div>
  );
}

export function Iso17025ResourcesEnvironmentLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 p-8 rounded-2xl border border-purple-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-purple-500/20 text-purple-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Laboratory Competence</span>
          <span className="text-slate-400 text-sm">ISO/IEC 17025:2017 · Module 2</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300 mt-0 mb-4">
          ทรัพยากร บุคลากร และการควบคุมสภาพแวดล้อมห้องปฏิบัติการ (Clause 6)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          คุณสมบัติและความสามารถของผู้ทดสอบ (Personnel Competency), การควบคุมสภาวะแวดล้อม (อุณหภูมิ 20 ± 2°C, ความชื้น 50 ± 10% RH) และการป้องกันการปนเปื้อนข้าม
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-2">การควบคุมสภาวะแวดล้อมการวัด</h3>
          <p className="text-sm text-slate-300">ห้องสอบเทียบและเครื่อง CMM ต้องควบคุมอุณหภูมิที่ 20 ± 2°C และความชื้นสัมพัทธ์ไม่เกิน 60% มีเครื่องบันทึก Thermo-Hygrometer แบบเรียลไทม์ หากหลุดเกณฑ์ต้องหยุดการทดสอบทันที</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-2">Competence & Equipment Maintenance</h3>
          <p className="text-sm text-slate-300">เครื่องมือวัดทุกชิ้นต้องมีประวัติการสอบเทียบและการบำรุงรักษาเชิงป้องกัน (PM) ผู้ทดสอบต้องผ่านการประเมินความชำนาญ (Blind Test / Repeatability Test) อย่างน้อยปีละ 1 ครั้ง</p>
        </div>
      </div>
    </div>
  );
}

export function Iso17025MethodsUncertaintyLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 p-8 rounded-2xl border border-purple-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-purple-500/20 text-purple-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Laboratory Competence</span>
          <span className="text-slate-400 text-sm">ISO/IEC 17025:2017 · Module 3</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300 mt-0 mb-4">
          การทวนสอบวิธีทดสอบและความไม่แน่นอนในการวัด (Clause 7.1 - 7.6)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          การทวนสอบวิธีทดสอบ (Method Validation / Verification), การประมาณค่าความไม่แน่นอนในการวัดตามคู่มือ GUM (Guide to the Expression of Uncertainty in Measurement)
        </p>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-3">การคำนวณค่าความไม่แน่นอนในการวัด (Measurement Uncertainty: GUM)</h3>
        <p className="text-sm text-slate-300 mb-4">
          รายงานผลการทดสอบต้องระบุค่าความไม่แน่นอนขยาย: <code>U = k × u_c</code> ที่ระดับความเชื่อมั่น 95% (Coverage Factor k = 2) โดยรวบรวมส่วนประกอบความไม่แน่นอน Type A (สถิติการวัดซ้ำ) และ Type B (ใบรับรองการสอบเทียบ, ความละเอียดเครื่องมือ, อุณหภูมิ)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-900 rounded-lg">
            <strong className="text-purple-300">Type A Evaluation:</strong> คำนวณจากค่าเบี่ยงเบนมาตรฐานของการวัดซ้ำ (Repeatability / Reproducibility)
          </div>
          <div className="p-3 bg-slate-900 rounded-lg">
            <strong className="text-pink-300">Type B Evaluation:</strong> คำนวณจากใบรับรอง Calibration Certificate, สเปกผู้ผลิตเครื่องมือ และผลกระทบจากอุณหภูมิ
          </div>
        </div>
      </div>
    </div>
  );
}

export function Iso17025TraceabilityQaLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 p-8 rounded-2xl border border-purple-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-purple-500/20 text-purple-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Laboratory Competence</span>
          <span className="text-slate-400 text-sm">ISO/IEC 17025:2017 · Module 4</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300 mt-0 mb-4">
          ความสอบกลับได้ทางมาตรวิทยาและการประกันคุณภาพผลแล็บ (Clause 7.7 & 8)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          ความสอบกลับได้ทางมาตรวิทยา (Metrological Traceability) สู่หน่วย SI สากล, การเข้าร่วมเปรียบเทียบผลระหว่างห้องปฏิบัติการ (Proficiency Testing: PT / ILC), และแผนภูมิควบคุมคุณภาพ (QC Control Chart)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-2">Metrological Traceability</h3>
          <p className="text-sm text-slate-300">เครื่องมือวัดมาตรฐานหลัก (Reference Standard) ต้องได้รับการสอบเทียบจากสถาบันมาตรวิทยาแห่งชาติ (NIMT) หรือห้องแล็บที่ได้รับการรับรอง ISO/IEC 17025 พร้อมมีโลโก้รับรอง (ILAC / TISI)</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-2">Proficiency Testing (PT / ILC)</h3>
          <p className="text-sm text-slate-300">ห้องแล็บต้องเข้าร่วมโปรแกรมเปรียบเทียบผลการทดสอบกับห้องแล็บภายนอกอย่างน้อยปีละ 1 ครั้ง และค่า En-Score หรือ Z-Score ต้องอยู่ในเกณฑ์ยอมรับ (|Z| ≤ 2.0)</p>
        </div>
      </div>
    </div>
  );
}
